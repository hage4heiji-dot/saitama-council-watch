import { z } from "zod";
import { IsoDateSchema } from "./common.js";

export const MeetingTypeSchema = z.enum(["plenary", "committee"]); // 本会議 / 委員会
export type MeetingType = z.infer<typeof MeetingTypeSchema>;

export const MeetingStatusSchema = z.enum(["scheduled", "held", "cancelled"]);
export type MeetingStatus = z.infer<typeof MeetingStatusSchema>;

export const MeetingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  meetingType: MeetingTypeSchema,
  sessionName: z.string().min(1), // 定例会/臨時会などの括り
  startDate: IsoDateSchema.nullable(), // 会期予定表から取得。未取得の場合はnull
  endDate: IsoDateSchema.nullable(),
  status: MeetingStatusSchema,
});
export type Meeting = z.infer<typeof MeetingSchema>;
