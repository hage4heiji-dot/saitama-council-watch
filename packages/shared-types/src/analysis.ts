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

/** statusを指定すると、その可決状態の議案に対する投票のみを対象にする */
export const LegislatorTagMatrixQuerySchema = z.object({
  status: BillStatusSchema.optional(),
});
export type LegislatorTagMatrixQuery = z.infer<typeof LegislatorTagMatrixQuerySchema>;
