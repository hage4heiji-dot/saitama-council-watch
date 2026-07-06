import type { BillRepository } from "../../domain/bill/BillRepository.js";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
import { politeFetch } from "../../infrastructure/scraper/httpClient.js";
import { fetchSessionBills, listSessionLinks } from "../../infrastructure/scraper/saitamaBillsScraper.js";
import { saveRawDocument } from "../../infrastructure/storage/RawDocumentStorage.js";

export interface IngestBillsDeps {
  documentRepository: DocumentRepository;
  meetingRepository: MeetingRepository;
  billRepository: BillRepository;
  rawStorageRoot: string;
}

export interface IngestBillsOptions {
  /** 直近何セッション分(バッチ単位)を対象にするか。政府サイトへの負荷配慮のため既定は小さく保つ */
  sessionLimit: number;
}

export interface IngestBillsResult {
  sessionsProcessed: number;
  billsUpserted: number;
  documentsCreated: number;
}

/**
 * 議案スクレイピング〜Postgres投入までのユースケース(Phase1、AI不使用)。
 * docs/design/01-basic-design.md §5 データフロー ①〜⑤に相当。
 */
export async function ingestBills(
  deps: IngestBillsDeps,
  options: IngestBillsOptions,
): Promise<IngestBillsResult> {
  const sessionLinks = await listSessionLinks();
  const targetLinks = sessionLinks.slice(0, options.sessionLimit);

  let billsUpserted = 0;
  let documentsCreated = 0;

  for (const link of targetLinks) {
    const meeting = await deps.meetingRepository.upsertBySessionNameAndType({
      name: link.sessionName,
      meetingType: "plenary",
      sessionName: link.sessionName,
      date: null,
    });

    const sessionBills = await fetchSessionBills(link);

    for (const bill of sessionBills.bills) {
      const { buffer } = await politeFetch(bill.pdfUrl);
      const saved = saveRawDocument(deps.rawStorageRoot, "pdf", buffer);

      const existingDocument = await deps.documentRepository.findLatestBySourceUrl(bill.pdfUrl);
      let documentId: string;
      if (existingDocument && existingDocument.checksum === saved.checksum) {
        // 内容に変更がなければ新しいバージョンを作らず既存の原本を再利用する(冪等性)
        documentId = existingDocument.id;
      } else {
        const created = await deps.documentRepository.create({
          type: "pdf",
          sourceUrl: bill.pdfUrl,
          storagePath: saved.storagePath,
          checksum: saved.checksum,
          fetchedAt: new Date(),
        });
        documentId = created.id;
        documentsCreated += 1;
      }

      await deps.billRepository.upsertByMeetingAndNumber({
        meetingId: meeting.id,
        billNumber: bill.billNumber,
        title: bill.title,
        category: "市長提出議案",
        submittedDate: sessionBills.submittedDate,
        sourceDocumentId: documentId,
      });
      billsUpserted += 1;
    }
  }

  return {
    sessionsProcessed: targetLinks.length,
    billsUpserted,
    documentsCreated,
  };
}
