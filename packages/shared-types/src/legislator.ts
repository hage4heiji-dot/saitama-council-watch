import { z } from "zod";
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
