import { z } from "zod";
import { IsoDateSchema } from "./common.js";

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
  submittedDate: IsoDateSchema,
  status: BillStatusSchema,
  sourceDocumentId: z.string().uuid(),
});
export type Bill = z.infer<typeof BillSchema>;

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
