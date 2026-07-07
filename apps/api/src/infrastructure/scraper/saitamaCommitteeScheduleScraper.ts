import * as cheerio from "cheerio";
import { parseCommitteeCellLines } from "../../domain/committeeMeeting/parseCommitteeCell.js";
import { pad2 } from "./eraDate.js";
import { politeFetch } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会「会議日程一覧」ページのスクレイパー(docs/adr/0023)。
 * 直近1年分の週ごとの本会議・委員会の開催日程が、週見出し(h2)+その直後のtableという
 * 構造で並んでいる(2026-07-07時点のHTML構造)。
 *
 * 対象: https://www.city.saitama.lg.jp/gikai/002/teireirinji/kaiginitteiitiran/p032830.html
 */

const ORIGIN = "https://www.city.saitama.lg.jp";
const SCHEDULE_PATH = "/gikai/002/teireirinji/kaiginitteiitiran/p032830.html";

// 例: "2026年7月6日から7月12日" / 年またぎの週のみ終了日側にも年が明記される:
// "2025年12月29日から2026年1月4日"
const WEEK_HEADING_PATTERN =
  /(?<startYear>\d{4})年(?<startMonth>\d{1,2})月(?<startDay>\d{1,2})日から(?:(?<endYear>\d{4})年)?(?<endMonth>\d{1,2})月(?<endDay>\d{1,2})日/;
// 例: "6月23日（火曜日）" 日付セルには年が含まれないため、週見出しから年を補う
const DAY_CELL_PATTERN = /(?<month>\d{1,2})月(?<day>\d{1,2})日/;

export interface ScrapedCommitteeMeetingEntry {
  date: string; // YYYY-MM-DD
  time: string | null;
  committeeName: string;
}

export async function scrapeCommitteeSchedule(): Promise<ScrapedCommitteeMeetingEntry[]> {
  await assertAllowedByRobotsTxt(ORIGIN, SCHEDULE_PATH);

  const url = `${ORIGIN}${SCHEDULE_PATH}`;
  const { buffer } = await politeFetch(url);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const entries: ScrapedCommitteeMeetingEntry[] = [];

  $(".entry > h2").each((_, headingEl) => {
    const headingMatch = WEEK_HEADING_PATTERN.exec($(headingEl).text().trim());
    if (!headingMatch?.groups) {
      return; // 「定例会の会期予定は...」等の案内見出しはスキップ
    }
    const { startYear, startMonth, endYear } = headingMatch.groups;
    const weekStartYear = Number(startYear);
    // 年をまたぐ週のみendYearが明記される。それ以外は日付セルの月が開始月以上になる
    // (週は最大7日なので、月が開始月を下回るのは12月→1月の年またぎのみ)。
    const weekEndYear = endYear ? Number(endYear) : weekStartYear;

    const table = $(headingEl).nextAll("table").first();
    if (table.length === 0) {
      return;
    }

    for (const row of table.find("tbody > tr").toArray()) {
      const cells = $(row).find("td");
      if (cells.length < 2) {
        continue;
      }

      const dateText = $(cells[0]).text().trim();
      const dayMatch = DAY_CELL_PATTERN.exec(dateText);
      if (!dayMatch?.groups) {
        continue; // ヘッダー行(「日付」)
      }
      const month = Number(dayMatch.groups.month);
      const day = Number(dayMatch.groups.day);
      const year = month < Number(startMonth) ? weekEndYear : weekStartYear;
      const date = `${year}-${pad2(month)}-${pad2(day)}`;

      const cellHtml = $(cells[1]).html() ?? "";
      const lines = cellHtml.split(/<br\s*\/?>/i).map((line) => line.replace(/<[^>]*>/g, ""));
      for (const entry of parseCommitteeCellLines(lines)) {
        entries.push({ date, time: entry.time, committeeName: entry.committeeName });
      }
    }
  });

  return entries;
}
