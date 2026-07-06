import { z } from "zod";
import { CursorPageQuerySchema, IsoDateSchema } from "./common.js";

export const BillStatusSchema = z.enum([
  "submitted",
  "in_deliberation",
  "passed",
  "rejected",
  "carried_over", // 継続審議
]);
export type BillStatus = z.infer<typeof BillStatusSchema>;

export const BillSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  billNumber: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  submittedDate: IsoDateSchema.nullable(), // 原本から解析できた場合のみ設定
  status: BillStatusSchema,
  sourceDocumentId: z.string().uuid(),
});
export type Bill = z.infer<typeof BillSchema>;

/**
 * 公開API向けの表示用DTO。原本PDFへのリンク(sourceUrl)を併記する
 * (docs/design/01-basic-design.md §5 ⑪、原本は当市サイトのものへ直接リンクする)。
 */
export const BillWithSourceSchema = BillSchema.extend({
  sourceUrl: z.string().url(),
});
export type BillWithSource = z.infer<typeof BillWithSourceSchema>;

export const BillListQuerySchema = CursorPageQuerySchema.extend({
  meetingId: z.string().uuid().optional(),
});
export type BillListQuery = z.infer<typeof BillListQuerySchema>;

const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

/**
 * 議案詳細向けDTO(Phase3)。承認済み(is_verified=true)のAIコンテンツのみを含める
 * (docs/adr/0007-ai-human-review-gate.md)。未承認の場合はnull/空配列。
 */
export const BillDetailSchema = BillWithSourceSchema.extend({
  aiSummary: z.string().nullable(),
  aiTags: z.array(z.string()),
  aiFaq: z.array(FaqItemSchema),
});
export type BillDetail = z.infer<typeof BillDetailSchema>;

export const OrdinanceStatusSchema = z.enum(["in_force", "abolished"]);
export type OrdinanceStatus = z.infer<typeof OrdinanceStatusSchema>;

export const OrdinanceSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  enactedDate: IsoDateSchema,
  billId: z.string().uuid().nullable(),
  status: OrdinanceStatusSchema,
  sourceDocumentId: z.string().uuid(),
});
export type Ordinance = z.infer<typeof OrdinanceSchema>;

export const VoteTypeSchema = z.enum(["for", "against", "absent", "abstain"]);
export type VoteType = z.infer<typeof VoteTypeSchema>;

export const VoteSchema = z.object({
  id: z.string().uuid(),
  billId: z.string().uuid(),
  legislatorId: z.string().uuid(),
  voteType: VoteTypeSchema,
  votedAt: z.string().datetime(),
});
export type Vote = z.infer<typeof VoteSchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  fiscalYear: z.number().int(),
  category: z.string().min(1),
  amount: z.number().nonnegative(),
  relatedBillId: z.string().uuid().nullable(),
  description: z.string(),
});
export type Budget = z.infer<typeof BudgetSchema>;
