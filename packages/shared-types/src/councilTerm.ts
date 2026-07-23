import { z } from "zod";
import { IsoDateSchema } from "./common.js";

/**
 * 市議会議員選挙の任期1件(docs/adr/0027)。過去の当選者は既存Legislatorと
 * 確実に一致するとは限らないため、legislatorIdは確信を持って一致できた場合のみ設定する。
 */
export const CouncilTermSchema = z.object({
  id: z.string().uuid(),
  origin: z.enum(["election", "runner_up_succession"]),
  electionKind: z.enum(["regular", "by_election"]).nullable(),
  electionDate: IsoDateSchema.nullable(),
  ward: z.string().min(1),
  candidateName: z.string().min(1),
  partyName: z.string().nullable(),
  electedRank: z.number().int().positive().nullable(),
  voteCount: z.number().nullable(),
  termStartDate: IsoDateSchema,
  // PDFに明記があったか(explicit)、統一地方選挙の慣例から算出したか(assumed)
  termStartDateBasis: z.enum(["explicit", "assumed"]),
  termEndDate: IsoDateSchema.nullable(),
  termEndDateBasis: z.enum(["explicit", "assumed"]).nullable(),
  resignedDate: IsoDateSchema.nullable(),
  legislatorId: z.string().uuid().nullable(),
});
export type CouncilTerm = z.infer<typeof CouncilTermSchema>;
