import { z } from "zod";
import { IsoDateSchema } from "./common.js";

/**
 * 会議日程一覧(docs/adr/0023)から取得する、本会議・委員会単位の個別日程。
 * committeeNameは原本の表記をそのまま保持し(捏造・過度な正規化をしない)、
 * committeeBaseNameは月次集計・分類向けに括弧書きを除いた基本名を別途持つ。
 */
export const CommitteeMeetingSchema = z.object({
  id: z.string().uuid(),
  date: IsoDateSchema,
  time: z.string().nullable(),
  committeeName: z.string().min(1),
  committeeBaseName: z.string().min(1),
  meetingId: z.string().uuid().nullable(),
});
export type CommitteeMeeting = z.infer<typeof CommitteeMeetingSchema>;
