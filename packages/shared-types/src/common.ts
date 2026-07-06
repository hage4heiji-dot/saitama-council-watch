import { z } from "zod";

/**
 * API全体で共通の値オブジェクト。
 * 原本を持たないAI生成コンテンツを型レベルでも作れないよう、
 * AiContentSchema (aiContent.ts) は必ず sourceDocumentId を必須にする。
 */
export const IsoDateTimeSchema = z.string().datetime();
export const IsoDateSchema = z.string().date();

export const CursorPageQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type CursorPageQuery = z.infer<typeof CursorPageQuerySchema>;

export function cursorPageResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    nextCursor: z.string().nullable(),
  });
}

export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
