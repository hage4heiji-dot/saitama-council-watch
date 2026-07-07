import { z } from "zod";
import { BillWithSourceSchema } from "./bill.js";

/**
 * 検索結果snippet中のハイライト区切り文字(制御文字)。
 * HTMLタグではなくこれらの文字でハイライト範囲を示すことで、
 * フロントエンドはdangerouslySetInnerHTMLを使わずに安全に描画できる。
 */
export const SNIPPET_HIGHLIGHT_START = "";
export const SNIPPET_HIGHLIGHT_END = "";

export const SearchQuerySchema = z.object({
  q: z.string().min(1, "検索キーワードを入力してください"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tag: z.string().min(1).optional(),
  meetingId: z.string().uuid().optional(),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const SearchResultItemSchema = z.object({
  bill: BillWithSourceSchema,
  snippet: z.string(),
});
export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultItemSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
