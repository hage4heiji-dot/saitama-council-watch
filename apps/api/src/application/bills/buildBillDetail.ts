import type { Bill, BillDetail } from "@saitama-council-watch/shared-types";
import type { AiContentRepository } from "../../domain/aiContent/AiContentRepository.js";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import { attachSourceUrl } from "./attachSourceUrl.js";

/**
 * 議案詳細DTOを組み立てる(Phase3)。承認済み(is_verified=true)のAIコンテンツのみを
 * 含める(docs/adr/0007-ai-human-review-gate.md)。未承認のものは公開しない。
 */
export async function buildBillDetail(
  bill: Bill,
  documentRepository: DocumentRepository,
  aiContentRepository: AiContentRepository,
): Promise<BillDetail> {
  const withSource = await attachSourceUrl(bill, documentRepository);
  const aiContents = await aiContentRepository.findBySourceDocumentId(bill.sourceDocumentId);
  const verified = aiContents.filter((content) => content.isVerified);

  const summary = verified.find((content) => content.contentType === "summary")?.body ?? null;
  const tagsBody = verified.find((content) => content.contentType === "tags")?.body;
  const faqBody = verified.find((content) => content.contentType === "faq")?.body;

  return {
    ...withSource,
    aiSummary: summary,
    aiTags: tagsBody ? (JSON.parse(tagsBody) as string[]) : [],
    aiFaq: faqBody ? (JSON.parse(faqBody) as { question: string; answer: string }[]) : [],
  };
}
