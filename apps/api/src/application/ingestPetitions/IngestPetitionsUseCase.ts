import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import type { LegislatorRepository } from "../../domain/legislator/LegislatorRepository.js";
import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
import { parsePetitionDocumentTable } from "../../domain/petition/petitionDocumentParsing.js";
import { matchIntroducingLegislators } from "../../domain/petition/petitionLegislatorMatching.js";
import { mapPetitionResultToStatus, parsePetitionResultsList } from "../../domain/petition/petitionResultParsing.js";
import type { PetitionRepository, UpsertPetitionInput } from "../../domain/petition/PetitionRepository.js";
import { extractPdfTextFromBuffer } from "../../infrastructure/documentText/extractPdfText.js";
import { parseSessionCore } from "../../infrastructure/scraper/eraDate.js";
import { fetchPetitionDocuments } from "../../infrastructure/scraper/saitamaPetitionScraper.js";
import { saveRawDocument } from "../../infrastructure/storage/RawDocumentStorage.js";

export interface IngestPetitionsDeps {
  meetingRepository: MeetingRepository;
  petitionRepository: PetitionRepository;
  legislatorRepository: LegislatorRepository;
  documentRepository: DocumentRepository;
  rawStorageRoot: string;
  /** 「会期が終了しているか」の判定基準時刻(テスト容易性のため呼び出し側から注入する) */
  now: Date;
}

export interface IngestPetitionsResult {
  meetingsProcessed: number;
  petitionsUpserted: number;
  lateResultsResolved: number;
}

/**
 * 会期終了後の本会議について、資料検索システム(Discuss Cabinet)が公開する
 * 「請願文書表」(全文)・「請願審議結果一覧」(結果)から請願をPetitionへ反映する(docs/adr/0026)。
 *
 * 既に取り込み済みで、かつ審議中(pending)の請願が残っていない会期は
 * 再スクレイピングの必要がないためスキップする(docs/adr/0016 審議結果同期と同じ方針)。
 *
 * 請願は受理された会期と、実際に議決される会期がずれることがある(実データで確認済み:
 * 会期末近くに受理された請願が、次の定例会の審議結果一覧で議決されるケース)。
 * このため会期は受理日の古い順に処理し、後続の会期の結果一覧に載っている「自分の
 * 詳細文書表には無い請願番号」については、過去の会期でpendingのまま残っている
 * 同番号の請願を検索して結果のみ反映する。
 */
export async function ingestPetitions(deps: IngestPetitionsDeps): Promise<IngestPetitionsResult> {
  const meetingsDescending = await deps.meetingRepository.findConcludedPlenarySessions(deps.now);
  const meetings = [...meetingsDescending].sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));
  const legislators = await deps.legislatorRepository.findAll();
  const knownLegislators = legislators.map((legislator) => ({ id: legislator.id, name: legislator.name }));

  let meetingsProcessed = 0;
  let petitionsUpserted = 0;
  let lateResultsResolved = 0;

  for (const meeting of meetings) {
    const sessionCore = parseSessionCore(meeting.sessionName);
    if (!sessionCore) {
      continue;
    }

    const existingPetitions = await deps.petitionRepository.findByMeetingId(meeting.id);
    const needsRefetch = existingPetitions.length === 0 || existingPetitions.some((p) => p.status === "pending");
    if (!needsRefetch) {
      continue;
    }

    let documents;
    try {
      documents = await fetchPetitionDocuments({
        era: sessionCore.era,
        eraYear: sessionCore.eraYear,
        month: sessionCore.month,
        sessionKind: sessionCore.sessionKind,
      });
    } catch (error) {
      console.error(`ingest-petitions: ${meeting.sessionName} の取得に失敗しました`, error);
      continue;
    }
    meetingsProcessed += 1;

    const detailsByNumber = new Map<
      string,
      { detail: ReturnType<typeof parsePetitionDocumentTable>[number]; sourceDocumentId: string }
    >();
    for (const doc of documents.detailDocuments) {
      const text = await extractPdfTextFromBuffer(doc.pdfBuffer);
      const items = parsePetitionDocumentTable(text);
      if (items.length === 0) {
        continue;
      }

      const saved = saveRawDocument(deps.rawStorageRoot, "pdf", doc.pdfBuffer);
      const existingDocument = await deps.documentRepository.findLatestBySourceUrl(doc.sourceUrl);
      const documentId =
        existingDocument && existingDocument.checksum === saved.checksum
          ? existingDocument.id
          : (
              await deps.documentRepository.create({
                type: "pdf",
                sourceUrl: doc.sourceUrl,
                storagePath: saved.storagePath,
                checksum: saved.checksum,
                fetchedAt: new Date(),
              })
            ).id;

      for (const item of items) {
        detailsByNumber.set(item.petitionNumber, { detail: item, sourceDocumentId: documentId });
      }
    }

    const resultsByNumber = new Map<string, ReturnType<typeof parsePetitionResultsList>[number]>();
    if (documents.resultDocument) {
      const text = await extractPdfTextFromBuffer(documents.resultDocument.pdfBuffer);
      for (const item of parsePetitionResultsList(text)) {
        resultsByNumber.set(item.petitionNumber, item);
      }
    }

    const upserts: UpsertPetitionInput[] = [];
    for (const [petitionNumber, { detail, sourceDocumentId }] of detailsByNumber) {
      const result = resultsByNumber.get(petitionNumber);
      const status = result ? (mapPetitionResultToStatus(result.resultText) ?? "unconfirmed") : "pending";

      upserts.push({
        meetingId: meeting.id,
        petitionNumber,
        title: detail.title,
        receivedDate: detail.receivedDate,
        petitionerName: detail.petitionerName,
        committeeName: detail.committeeName,
        summary: detail.summary,
        status,
        decidedDate: result?.decidedDate ?? null,
        sourceDocumentId,
        introducers: matchIntroducingLegislators(detail.introducingLegislatorsRawText, knownLegislators),
      });
    }

    if (upserts.length > 0) {
      await deps.petitionRepository.upsertMany(upserts);
      petitionsUpserted += upserts.length;
    }

    for (const [petitionNumber, result] of resultsByNumber) {
      if (detailsByNumber.has(petitionNumber)) {
        continue;
      }
      const status = mapPetitionResultToStatus(result.resultText) ?? "unconfirmed";
      const candidates = await deps.petitionRepository.findPendingByPetitionNumber(petitionNumber);
      if (candidates.length !== 1) {
        // 該当なし、または同番号のpendingが複数あって曖昧な場合は反映しない(捏造しない)。
        continue;
      }
      await deps.petitionRepository.updateResult(candidates[0]!.id, status, result.decidedDate);
      lateResultsResolved += 1;
    }
  }

  return { meetingsProcessed, petitionsUpserted, lateResultsResolved };
}
