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
  verifiedBy: z.string().uuid().nullable(),
  verifiedAt: IsoDateTimeSchema.nullable(),
});
export type AiContent = z.infer<typeof AiContentSchema>;

/** 公開Web側で表示可能なAIコンテンツ(未確認のものは型で除外) */
export const PublishedAiContentSchema = AiContentSchema.extend({
  isVerified: z.literal(true),
  verifiedBy: z.string().uuid(),
  verifiedAt: IsoDateTimeSchema,
});
export type PublishedAiContent = z.infer<typeof PublishedAiContentSchema>;
