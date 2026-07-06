import type { Meeting, MeetingType } from "@saitama-council-watch/shared-types";
import type { Page, PageQuery } from "../shared/Page.js";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertMeetingInput {
  name: string;
  meetingType: MeetingType;
  sessionName: string;
}

export interface SessionPeriod {
  startDate: string;
  endDate: string;
}

export interface MeetingRepository {
  upsertBySessionNameAndType(input: UpsertMeetingInput): Promise<Meeting>;
  /** 会期予定表から取得した開始日・終了日を反映する(Phase1b、docs/adr/0011) */
  updateSessionPeriod(
    sessionName: string,
    meetingType: MeetingType,
    period: SessionPeriod,
  ): Promise<Meeting | null>;
  findPage(query: PageQuery): Promise<Page<Meeting>>;
  findById(id: string): Promise<Meeting | null>;
  /** 会期が既に終了している(endDate < asOf)本会議を取得する(docs/adr/0016 審議結果同期の対象選定) */
  findConcludedPlenarySessions(asOf: Date): Promise<Meeting[]>;
}
