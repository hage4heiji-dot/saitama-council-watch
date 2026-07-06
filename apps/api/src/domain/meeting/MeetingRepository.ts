import type { Meeting, MeetingType } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertMeetingInput {
  name: string;
  meetingType: MeetingType;
  sessionName: string;
  date: string | null;
}

export interface MeetingRepository {
  upsertBySessionNameAndType(input: UpsertMeetingInput): Promise<Meeting>;
}
