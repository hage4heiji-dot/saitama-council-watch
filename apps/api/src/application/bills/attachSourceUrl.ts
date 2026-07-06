import type { Bill, BillWithSource } from "@saitama-council-watch/shared-types";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";

/**
 * 公開APIの表示用に、議案へ原本PDFの直リンク(sourceUrl)を付与する。
 * 内部で保管しているキャッシュ済みファイル(storagePath)ではなく、
 * さいたま市サイトの原本URLをリンク先にする(著作権配慮、docs/adr/0002)。
 */
export async function attachSourceUrl(
  bill: Bill,
  documentRepository: DocumentRepository,
): Promise<BillWithSource> {
  const document = await documentRepository.findById(bill.sourceDocumentId);
  if (!document) {
    throw new Error(`Bill ${bill.id} の sourceDocumentId(${bill.sourceDocumentId}) に対応するDocumentが見つかりません`);
  }
  return { ...bill, sourceUrl: document.sourceUrl };
}

export async function attachSourceUrlToMany(
  bills: Bill[],
  documentRepository: DocumentRepository,
): Promise<BillWithSource[]> {
  return Promise.all(bills.map((bill) => attachSourceUrl(bill, documentRepository)));
}
