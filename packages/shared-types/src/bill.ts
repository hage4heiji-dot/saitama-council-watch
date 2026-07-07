import { z } from "zod";
import { CursorPageQuerySchema, IsoDateSchema } from "./common.js";

export const BillStatusSchema = z.enum([
  "submitted",
  "in_deliberation",
  "passed",
  "rejected",
  "carried_over", // 継続審議
  "unconfirmed", // 審議結果の原本から結果を特定できなかった(docs/adr/0016)
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
 * tagsは承認済み(is_verified=true)のAIタグのみを含む(docs/adr/0007)。
 */
export const BillWithSourceSchema = BillSchema.extend({
  sourceUrl: z.string().url(),
  tags: z.array(z.string()),
});
export type BillWithSource = z.infer<typeof BillWithSourceSchema>;

export const BillListQuerySchema = CursorPageQuerySchema.extend({
  meetingId: z.string().uuid().optional(),
  status: BillStatusSchema.optional(),
  tag: z.string().min(1).optional(),
});
export type BillListQuery = z.infer<typeof BillListQuerySchema>;

const FaqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

/**
 * 議案詳細向けDTO(Phase3)。承認済み(is_verified=true)のAIコンテンツのみを含める
 * (docs/adr/0007-ai-human-review-gate.md)。未承認の場合はnull/空配列。
 * タグは継承元のBillWithSourceSchema.tagsを使う(議案一覧・検索と同じ解決ロジック)。
 */
export const BillDetailSchema = BillWithSourceSchema.extend({
  aiSummary: z.string().nullable(),
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

/**
 * 議案詳細画面での表決態度表示向けDTO(docs/adr/0017)。
 * 議員名・会派名を併記することでVote単体より表示に適した形にする。
 */
export const VoteWithLegislatorSchema = z.object({
  legislatorId: z.string().uuid(),
  legislatorName: z.string(),
  factionName: z.string().nullable(),
  voteType: VoteTypeSchema,
});
export type VoteWithLegislator = z.infer<typeof VoteWithLegislatorSchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  fiscalYear: z.number().int(),
  category: z.string().min(1),
  amount: z.number().nonnegative(),
  relatedBillId: z.string().uuid().nullable(),
  description: z.string(),
});
export type Budget = z.infer<typeof BudgetSchema>;
