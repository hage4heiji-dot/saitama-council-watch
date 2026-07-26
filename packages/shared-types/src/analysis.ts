import { z } from "zod";
import { BillStatusSchema } from "./bill.js";

/**
 * 議員×タグのクロス集計向け(docs/adr/0019)。
 * 賛成・反対の件数のみを持つ(欠席・棄権は現時点では表示しない、UIのシンプルさ優先)。
 */
export const LegislatorTagCellSchema = z.object({
  for: z.number().int().nonnegative(),
  against: z.number().int().nonnegative(),
});
export type LegislatorTagCell = z.infer<typeof LegislatorTagCellSchema>;

export const LegislatorTagMatrixRowSchema = z.object({
  legislatorId: z.string().uuid(),
  legislatorName: z.string(),
  factionName: z.string().nullable(),
  cellsByTag: z.record(z.string(), LegislatorTagCellSchema),
});
export type LegislatorTagMatrixRow = z.infer<typeof LegislatorTagMatrixRowSchema>;

export const LegislatorTagMatrixSchema = z.object({
  tags: z.array(z.string()),
  rows: z.array(LegislatorTagMatrixRowSchema),
});
export type LegislatorTagMatrix = z.infer<typeof LegislatorTagMatrixSchema>;

/**
 * statusを指定すると、その可決状態の議案に対する投票のみを対象にする。
 * meetingIdを指定すると、その会期(定例会・臨時会)の議案のみを対象にする(期間の絞り込み、docs/adr/0021)。
 */
export const LegislatorTagMatrixQuerySchema = z.object({
  status: BillStatusSchema.optional(),
  meetingId: z.string().uuid().optional(),
});
export type LegislatorTagMatrixQuery = z.infer<typeof LegislatorTagMatrixQuerySchema>;

/**
 * 会派×タグのクロス集計向け(docs/adr/0022)。議員×タグと同じ絞り込み軸だが、
 * 行を議員単位ではなく会派単位でロールアップしたもの。無所属・会派不明はまとめて
 * 「無所属」行にする。
 */
export const FactionTagMatrixRowSchema = z.object({
  factionName: z.string(),
  cellsByTag: z.record(z.string(), LegislatorTagCellSchema),
});
export type FactionTagMatrixRow = z.infer<typeof FactionTagMatrixRowSchema>;

export const FactionTagMatrixSchema = z.object({
  tags: z.array(z.string()),
  rows: z.array(FactionTagMatrixRowSchema),
});
export type FactionTagMatrix = z.infer<typeof FactionTagMatrixSchema>;

/**
 * 会派別反対率ランキング向け。会派に所属する議員が投じたfor/against票のうち、
 * againstの割合(dissentRate、0〜1)を会派ごとに算出したもの。abstain/absentは
 * 賛否の意思表示ではないため母数から除外する。無所属・会派不明はまとめて
 * 「無所属」行にする。反対率の降順で返す。
 */
export const FactionDissentRowSchema = z.object({
  factionName: z.string(),
  forCount: z.number().int().nonnegative(),
  againstCount: z.number().int().nonnegative(),
  dissentRate: z.number().min(0).max(1),
});
export type FactionDissentRow = z.infer<typeof FactionDissentRowSchema>;

export const FactionDissentRankingSchema = z.object({
  rows: z.array(FactionDissentRowSchema),
});
export type FactionDissentRanking = z.infer<typeof FactionDissentRankingSchema>;
