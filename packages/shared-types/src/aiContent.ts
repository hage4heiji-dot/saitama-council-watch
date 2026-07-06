import { z } from "zod";
import { IsoDateTimeSchema } from "./common.js";

/**
 * AIは事実を創作してはいけない(docs/design/00-constitution.md)。
 * この制約を型レベルでも表現するため、sourceDocumentId は必須(optionalにしない)。
 * 公開表示は isVerified === true のもののみ許可する
 * (docs/adr/0007-ai-human-review-gate.md)。
 */
export const AiContentTypeSchema = z.enum(["summary", "tags", "faq", "related_info"]);
export type AiContentType = z.infer<typeof AiContentTypeSchema>;

export const AiContentSchema = z.object({
  id: z.string().uuid(),
  sourceDocumentId: z.string().uuid(),
  contentType: AiContentTypeSchema,
  body: z.string().min(1),
  modelVersion: z.string().min(1),
  promptVersion: z.string().min(1),
  generatedAt: IsoDateTimeSchema,
  isVerified: z.boolean(),
  // Phase3時点ではOAuthユーザーがまだ存在しないため、UUIDではなく
  // 管理トークンによるレビュー担当者名等の任意の文字列を許容する(docs/adr/0013)。
  verifiedBy: z.string().min(1).nullable(),
  verifiedAt: IsoDateTimeSchema.nullable(),
  // グラウンディング検証で問題が見つかった場合のみ設定(docs/design/01-basic-design.md §6.2)
  groundingNote: z.string().nullable(),
});
export type AiContent = z.infer<typeof AiContentSchema>;

/** 公開Web側で表示可能なAIコンテンツ(未確認のものは型で除外) */
export const PublishedAiContentSchema = AiContentSchema.extend({
  isVerified: z.literal(true),
  verifiedBy: z.string().min(1),
  verifiedAt: IsoDateTimeSchema,
});
export type PublishedAiContent = z.infer<typeof PublishedAiContentSchema>;

/** 管理確認画面向け(Phase3、docs/adr/0007)。レビューに必要な議案情報を併記する */
export const AiContentReviewItemSchema = z.object({
  aiContent: AiContentSchema,
  billNumber: z.string(),
  billTitle: z.string(),
  sourceUrl: z.string().url(),
});
export type AiContentReviewItem = z.infer<typeof AiContentReviewItemSchema>;

export const VerifyAiContentInputSchema = z.object({
  verifiedBy: z.string().min(1, "確認者名を入力してください"),
});
export type VerifyAiContentInput = z.infer<typeof VerifyAiContentInputSchema>;
