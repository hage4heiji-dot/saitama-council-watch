import { z } from "zod";
import { BillStatusSchema, VoteTypeSchema } from "./bill.js";
import { IsoDateSchema } from "./common.js";

export const FactionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  foundedDate: IsoDateSchema.nullable(),
  isActive: z.boolean(),
});
export type Faction = z.infer<typeof FactionSchema>;

export const LegislatorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  nameKana: z.string().min(1),
  firstElectedDate: IsoDateSchema.nullable(),
  isActive: z.boolean(),
  profileUrl: z.string().url().nullable(),
  currentFaction: FactionSchema.nullable(),
});
export type Legislator = z.infer<typeof LegislatorSchema>;

export const LegislatorFactionHistoryEntrySchema = z.object({
  legislatorId: z.string().uuid(),
  faction: FactionSchema,
  validFrom: IsoDateSchema,
  validTo: IsoDateSchema.nullable(),
});
export type LegislatorFactionHistoryEntry = z.infer<typeof LegislatorFactionHistoryEntrySchema>;

/**
 * 議員の活動記録画面向け(docs/adr/0020)。投票した議案1件を、議案情報・タグ・
 * 表決態度とあわせて表示するためのDTO。tagsは承認済み(is_verified=true)のAIタグのみ
 * (docs/adr/0007)。
 */
export const LegislatorVoteRecordSchema = z.object({
  billId: z.string().uuid(),
  billNumber: z.string().min(1),
  billTitle: z.string().min(1),
  billStatus: BillStatusSchema,
  sourceUrl: z.string().url(),
  tags: z.array(z.string()),
  voteType: VoteTypeSchema,
  votedAt: IsoDateSchema,
});
export type LegislatorVoteRecord = z.infer<typeof LegislatorVoteRecordSchema>;

export const LegislatorVoteSummarySchema = z.object({
  for: z.number().int().nonnegative(),
  against: z.number().int().nonnegative(),
  absent: z.number().int().nonnegative(),
  abstain: z.number().int().nonnegative(),
});
export type LegislatorVoteSummary = z.infer<typeof LegislatorVoteSummarySchema>;

/**
 * 議員詳細(活動記録)画面向けDTO。会派移動履歴と投票記録を併記する。
 * 「その人がどういった活動をしたのか」を判断できることを目的とする
 * (docs/adr/0020)。
 */
export const LegislatorDetailSchema = LegislatorSchema.extend({
  factionHistory: z.array(LegislatorFactionHistoryEntrySchema.omit({ legislatorId: true })),
  voteSummary: LegislatorVoteSummarySchema,
  voteRecords: z.array(LegislatorVoteRecordSchema),
});
export type LegislatorDetail = z.infer<typeof LegislatorDetailSchema>;

export const LegislatorListQuerySchema = z.object({
  includeInactive: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => v === "true"),
});
export type LegislatorListQuery = z.infer<typeof LegislatorListQuerySchema>;
