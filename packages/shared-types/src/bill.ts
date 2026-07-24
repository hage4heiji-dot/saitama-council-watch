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
  /** 提出日順。既定は新しい順(desc) */
  sort: z.enum(["asc", "desc"]).optional(),
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

/**
 * 「条例一覧」v1向け(docs/adr/0025)。上記の`Ordinance`(条例名ごとに現在の状態を
 * 追跡するレジストリ)とは別物で、条例に関する議案(Bill)をタイトルパターンで
 * 種別分類しただけの表示用DTO。取り込み開始(令和8年2月)より前の制定日は
 * 分からないため、レジストリ化はせず議案そのものの実データのみを表示する。
 */
export const OrdinanceBillKindSchema = z.enum(["enactment", "amendment", "abolition"]);
export type OrdinanceBillKind = z.infer<typeof OrdinanceBillKindSchema>;

/**
 * 議案の可決/否決だけでは会派間の賛否の分かれ方が見えないため、表決態度データ
 * (docs/adr/0017)が取れている議案には賛否の内訳を併記する(取れていない議案はnull。
 * 表決態度PDFは会期内の一部の議案しか対象にしないため、全件には存在しない)。
 */
export const VoteTallySchema = z.object({
  for: z.number().int().nonnegative(),
  against: z.number().int().nonnegative(),
  absent: z.number().int().nonnegative(),
  abstain: z.number().int().nonnegative(),
});
export type VoteTally = z.infer<typeof VoteTallySchema>;

export const OrdinanceBillSchema = BillWithSourceSchema.extend({
  kind: OrdinanceBillKindSchema,
  voteTally: VoteTallySchema.nullable(),
});
export type OrdinanceBill = z.infer<typeof OrdinanceBillSchema>;

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

export const BudgetTypeSchema = z.enum(["expenditure", "revenue"]);
export type BudgetType = z.infer<typeof BudgetTypeSchema>;

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  fiscalYear: z.number().int(),
  /** 一般会計/各特別会計の別(docs/adr/0024) */
  accountName: z.string().min(1),
  category: z.string().min(1),
  /** 歳出(支出)/歳入(収入)の別(docs/adr/0028) */
  budgetType: BudgetTypeSchema,
  amount: z.number().nonnegative(),
  relatedBillId: z.string().uuid().nullable(),
  description: z.string(),
});
export type Budget = z.infer<typeof BudgetSchema>;
