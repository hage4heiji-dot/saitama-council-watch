import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
import { parseSessionCore } from "../../infrastructure/scraper/eraDate.js";
import {
  fetchSessionPeriod,
  listSessionInfoLinks,
} from "../../infrastructure/scraper/saitamaSessionScheduleScraper.js";

export interface IngestSessionScheduleDeps {
  meetingRepository: MeetingRepository;
}

export interface IngestSessionScheduleOptions {
  /** 直近何会期分を対象にするか。政府サイトへの負荷配慮のため既定は小さく保つ */
  sessionLimit: number;
}

export interface IngestSessionScheduleResult {
  sessionsChecked: number;
  meetingsUpdated: number;
}

/**
 * 会期予定表(開始日・終了日)を取得し、既存のMeeting行を更新するユースケース(Phase1b)。
 * docs/adr/0010で「原本にない日付を捏造しない」とした方針に基づき、
 * 対応するMeetingが存在しない、または期間が解析できない会期は静かにスキップする。
 *
 * 会期予定表ページと議案ページとでは同じ会期でも表記が異なることがある(実データで確認済み:
 * 議案ページ「令和7年12月（11月繰上げ）定例会」/ 会期予定表ページ「令和7年12月定例会」)。
 * Meeting.sessionNameは議案ページ側の表記で作成されるため、文字列完全一致では
 * マッチせず開始日・終了日が反映されないケースがあった。年度・月・定例会/臨時会の別で
 * 照合してから、実際のMeeting.sessionNameを使って更新する。
 */
export async function ingestSessionSchedule(
  deps: IngestSessionScheduleDeps,
  options: IngestSessionScheduleOptions,
): Promise<IngestSessionScheduleResult> {
  const links = await listSessionInfoLinks();
  const targetLinks = links.slice(0, options.sessionLimit);
  const existingMeetings = await deps.meetingRepository.findAll();

  let meetingsUpdated = 0;
  for (const link of targetLinks) {
    const period = await fetchSessionPeriod(link);
    if (!period.startDate || !period.endDate) {
      continue;
    }

    const linkCore = parseSessionCore(link.sessionName);
    if (!linkCore) {
      continue;
    }
    const matchedMeeting = existingMeetings.find((meeting) => {
      if (meeting.meetingType !== "plenary") {
        return false;
      }
      const meetingCore = parseSessionCore(meeting.sessionName);
      return (
        meetingCore?.era === linkCore.era &&
        meetingCore.eraYear === linkCore.eraYear &&
        meetingCore.month === linkCore.month &&
        meetingCore.sessionKind === linkCore.sessionKind
      );
    });
    if (!matchedMeeting) {
      continue;
    }

    const updated = await deps.meetingRepository.updateSessionPeriod(matchedMeeting.sessionName, "plenary", {
      startDate: period.startDate,
      endDate: period.endDate,
    });
    if (updated) {
      meetingsUpdated += 1;
    }
  }

  return { sessionsChecked: targetLinks.length, meetingsUpdated };
}
