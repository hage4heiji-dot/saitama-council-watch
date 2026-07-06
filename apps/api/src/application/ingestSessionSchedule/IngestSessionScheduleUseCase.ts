import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
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
 */
export async function ingestSessionSchedule(
  deps: IngestSessionScheduleDeps,
  options: IngestSessionScheduleOptions,
): Promise<IngestSessionScheduleResult> {
  const links = await listSessionInfoLinks();
  const targetLinks = links.slice(0, options.sessionLimit);

  let meetingsUpdated = 0;
  for (const link of targetLinks) {
    const period = await fetchSessionPeriod(link);
    if (!period.startDate || !period.endDate) {
      continue;
    }

    const updated = await deps.meetingRepository.updateSessionPeriod(link.sessionName, "plenary", {
      startDate: period.startDate,
      endDate: period.endDate,
    });
    if (updated) {
      meetingsUpdated += 1;
    }
  }

  return { sessionsChecked: targetLinks.length, meetingsUpdated };
}
