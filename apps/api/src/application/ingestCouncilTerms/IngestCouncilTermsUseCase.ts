import type { CouncilTermRepository, UpsertCouncilTermInput } from "../../domain/councilTerm/CouncilTermRepository.js";
import { buildCouncilTermCandidates, parseElectionResultDocument } from "../../domain/councilTerm/electionResultTableParsing.js";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import type { LegislatorRepository } from "../../domain/legislator/LegislatorRepository.js";
import { extractPdfTextViaPoppler } from "../../infrastructure/documentText/extractPdfTextViaPoppler.js";
import {
  fetchElectionResultPdf,
  type ElectionResultQuery,
} from "../../infrastructure/scraper/saitamaElectionResultsScraper.js";
import { saveRawDocument } from "../../infrastructure/storage/RawDocumentStorage.js";

export interface CouncilTermElectionConfig {
  query: ElectionResultQuery;
  /** 選挙執行日(ISO)。任期日付が原本に明記されていない場合のASSUMED算出の起点にする */
  electionDate: string;
  electionKind: "regular" | "by_election";
}

export interface IngestCouncilTermsDeps {
  documentRepository: DocumentRepository;
  councilTermRepository: CouncilTermRepository;
  legislatorRepository: LegislatorRepository;
  rawStorageRoot: string;
}

export interface IngestCouncilTermsResult {
  electionsProcessed: number;
  termsUpserted: number;
  documentsCreated: number;
}

function stripWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

/**
 * 過去の市議会議員選挙結果PDFを解析し、CouncilTermとして取り込むユースケース(docs/adr/0027)。
 * 一度きりのバックフィル(過去の確定した選挙結果は変化しない)であり、cronには登録しない。
 */
export async function ingestCouncilTerms(
  deps: IngestCouncilTermsDeps,
  elections: CouncilTermElectionConfig[],
): Promise<IngestCouncilTermsResult> {
  const legislators = await deps.legislatorRepository.findAll({ includeInactive: true });

  let termsUpserted = 0;
  let documentsCreated = 0;

  for (const election of elections) {
    const { pdfBuffer, sourceUrl } = await fetchElectionResultPdf(election.query);
    const saved = saveRawDocument(deps.rawStorageRoot, "pdf", pdfBuffer);

    const existingDocument = await deps.documentRepository.findLatestBySourceUrl(sourceUrl);
    let documentId: string;
    if (existingDocument && existingDocument.checksum === saved.checksum) {
      documentId = existingDocument.id;
    } else {
      const created = await deps.documentRepository.create({
        type: "pdf",
        sourceUrl,
        storagePath: saved.storagePath,
        checksum: saved.checksum,
        fetchedAt: new Date(),
      });
      documentId = created.id;
      documentsCreated += 1;
    }

    const rawText = await extractPdfTextViaPoppler(pdfBuffer);
    const wardResults = parseElectionResultDocument(rawText);

    const inputs: UpsertCouncilTermInput[] = [];
    for (const wardResult of wardResults) {
      const candidates = buildCouncilTermCandidates(wardResult, election.electionDate, election.electionKind);
      for (const candidate of candidates) {
        const legislatorId =
          legislators.find((legislator) => stripWhitespace(legislator.name) === stripWhitespace(candidate.candidateRawName))
            ?.id ?? null;
        inputs.push({ ...candidate, legislatorId, sourceDocumentId: documentId });
      }
    }

    termsUpserted += await deps.councilTermRepository.upsertMany(inputs);
  }

  return { electionsProcessed: elections.length, termsUpserted, documentsCreated };
}
