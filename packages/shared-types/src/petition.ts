import { z } from "zod";
import { IsoDateSchema } from "./common.js";

/**
 * 請願(docs/adr/0026)。市議会議員の紹介を要する市民からの要望。
 * 原文(要旨)まで保持する。紹介議員は複数人つきうる。
 */
export const PetitionStatusSchema = z.enum([
  "pending", // 請願文書表(全文)はあるが、まだ審議結果一覧に載っていない(審議中)
  "adopted", // 採択
  "rejected", // 不採択
  "withdrawn", // 取下げ
  "carried_over", // 継続審査
  "unconfirmed", // 審議結果一覧の文言が既知のものと一致しない(docs/adr/0016と同じ方針)
]);
export type PetitionStatus = z.infer<typeof PetitionStatusSchema>;

export const PetitionIntroducerSchema = z.object({
  /** 原本の表記(捏造しない) */
  rawName: z.string().min(1),
  /** 既存の議員データと一致した場合のみ設定する */
  legislatorId: z.string().uuid().nullable(),
});
export type PetitionIntroducer = z.infer<typeof PetitionIntroducerSchema>;

export const PetitionSchema = z.object({
  id: z.string().uuid(),
  meetingId: z.string().uuid(),
  petitionNumber: z.string().min(1),
  title: z.string().min(1),
  receivedDate: IsoDateSchema.nullable(),
  petitionerName: z.string().min(1),
  committeeName: z.string().nullable(),
  summary: z.string(),
  status: PetitionStatusSchema,
  decidedDate: IsoDateSchema.nullable(),
  sourceDocumentId: z.string().uuid(),
  introducers: z.array(PetitionIntroducerSchema),
});
export type Petition = z.infer<typeof PetitionSchema>;

/** 公開API向けの表示用DTO。原本PDFへのリンク(sourceUrl)を併記する */
export const PetitionWithSourceSchema = PetitionSchema.extend({
  sourceUrl: z.string().url(),
});
export type PetitionWithSource = z.infer<typeof PetitionWithSourceSchema>;
