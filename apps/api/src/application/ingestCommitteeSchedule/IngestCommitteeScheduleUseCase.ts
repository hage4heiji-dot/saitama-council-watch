import type { Meeting } from "@saitama-council-watch/shared-types";
import type {
  CommitteeMeetingRepository,
  UpsertCommitteeMeetingInput,
} from "../../domain/committeeMeeting/CommitteeMeetingRepository.js";
import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
import { scrapeCommitteeSchedule } from "../../infrastructure/scraper/saitamaCommitteeScheduleScraper.js";

export interface IngestCommitteeScheduleDeps {
  committeeMeetingRepository: CommitteeMeetingRepository;
  meetingRepository: MeetingRepository;
}

export interface IngestCommitteeScheduleResult {
  entriesScraped: number;
}

/** dateがその会期(Meeting)の開始日〜終了日の範囲内にあるかで対応関係を判定する */
function resolveMeetingId(date: string, meetings: Meeting[]): string | null {
  const match = meetings.find((meeting) => meeting.startDate && meeting.endDate && date >= meeting.startDate && date <= meeting.endDate);
  return match?.id ?? null;
}

/**
 * 会議日程一覧(docs/adr/0023)を取得し、CommitteeMeeting行をupsertするユースケース。
 * 対応する会期(Meeting)が判定できた場合のみmeetingIdを設定し、判定できない場合はnullのままにする
 * (捏造しない、docs/design/00-constitution.md)。
 */
export async function ingestCommitteeSchedule(deps: IngestCommitteeScheduleDeps): Promise<IngestCommitteeScheduleResult> {
  const [entries, meetings] = await Promise.all([scrapeCommitteeSchedule(), deps.meetingRepository.findAll()]);

  const inputs: UpsertCommitteeMeetingInput[] = entries.map((entry) => ({
    date: entry.date,
    time: entry.time,
    committeeName: entry.committeeName,
    meetingId: resolveMeetingId(entry.date, meetings),
  }));

  await deps.committeeMeetingRepository.upsertMany(inputs);

  return { entriesScraped: inputs.length };
}
