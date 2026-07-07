import type { Bill, BillWithSource } from "@saitama-council-watch/shared-types";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";

/**
 * 公開APIの表示用に、議案へ原本PDFの直リンク(sourceUrl)と承認済みAIタグ(tags)を
 * 付与する。原本URLは内部で保管しているキャッシュ済みファイル(storagePath)ではなく、
 * さいたま市サイトの原本URLをリンク先にする(著作権配慮、docs/adr/0002)。
 * タグの解決はdomain/aiContent/billTags.tsに委譲するため、呼び出し側で
 * 事前に組み立てたsourceDocumentId→タグのマップを受け取る。
 */
export async function attachSourceUrl(
  bill: Bill,
  documentRepository: DocumentRepository,
  tagsBySourceDocumentId: Map<string, string[]> = new Map(),
): Promise<BillWithSource> {
  const document = await documentRepository.findById(bill.sourceDocumentId);
  if (!document) {
    throw new Error(`Bill ${bill.id} の sourceDocumentId(${bill.sourceDocumentId}) に対応するDocumentが見つかりません`);
  }
  return {
    ...bill,
    sourceUrl: document.sourceUrl,
    tags: tagsBySourceDocumentId.get(bill.sourceDocumentId) ?? [],
  };
}

export async function attachSourceUrlToMany(
  bills: Bill[],
  documentRepository: DocumentRepository,
  tagsBySourceDocumentId: Map<string, string[]> = new Map(),
): Promise<BillWithSource[]> {
  return Promise.all(bills.map((bill) => attachSourceUrl(bill, documentRepository, tagsBySourceDocumentId)));
}
