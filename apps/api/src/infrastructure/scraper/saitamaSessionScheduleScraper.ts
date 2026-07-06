import * as cheerio from "cheerio";
import { eraYearToSeireki, pad2, parseSessionCore, type Era } from "./eraDate.js";
import { politeFetch } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会「定例会・臨時会の情報」ページのスクレイパー(Phase1b、docs/adr/0011)。
 *
 * 対象:
 *   - セッション情報一覧: .../gikai/002/teireirinji/teireikairinjikainojouhou12/index.html
 *   - セッション詳細(会期予定表の見出しに開始日・終了日): 例) .../p130952.html
 *
 * 2026-07-06時点のHTML構造に基づく(docs/adr/0001-architecture-style.md)。
 */

const ORIGIN = "https://www.city.saitama.lg.jp";
const SESSION_INFO_INDEX_PATH = "/gikai/002/teireirinji/teireikairinjikainojouhou12/index.html";

// 例: "日程(6月3日〜6月26日 24日間)" ※実際の全角括弧・波ダッシュ表記に対応
const PERIOD_HEADING_PATTERN = /(?<startMonth>\d+)月(?<startDay>\d+)日[〜～\-](?<endMonth>\d+)月(?<endDay>\d+)日/;

export interface ScrapedSessionInfoLink {
  sessionName: string;
  detailUrl: string;
  era: Era;
  eraYear: number;
}

export interface ScrapedSessionPeriod {
  startDate: string | null;
  endDate: string | null;
}

/** セッション情報一覧ページから各会期の詳細ページへのリンクを取得する */
export async function listSessionInfoLinks(): Promise<ScrapedSessionInfoLink[]> {
  await assertAllowedByRobotsTxt(ORIGIN, SESSION_INFO_INDEX_PATH);

  const indexUrl = `${ORIGIN}${SESSION_INFO_INDEX_PATH}`;
  const { buffer } = await politeFetch(indexUrl);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const links: ScrapedSessionInfoLink[] = [];
  $("h2.title a").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text().trim();
    if (!href || !text) {
      return;
    }

    const sessionCore = parseSessionCore(text);
    if (!sessionCore) {
      return;
    }

    links.push({
      sessionName: sessionCore.core,
      detailUrl: new URL(href, indexUrl).toString(),
      era: sessionCore.era,
      eraYear: sessionCore.eraYear,
    });
  });

  return links;
}

/** セッション詳細ページの「日程(M月D日〜M月D日 N日間)」見出しから会期の開始日・終了日を取得する */
export async function fetchSessionPeriod(link: ScrapedSessionInfoLink): Promise<ScrapedSessionPeriod> {
  const { buffer } = await politeFetch(link.detailUrl);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const headingText = $(".entry h2").first().text();
  const match = PERIOD_HEADING_PATTERN.exec(headingText);
  const { startMonth, startDay, endMonth, endDay } = match?.groups ?? {};
  if (!startMonth || !startDay || !endMonth || !endDay) {
    return { startDate: null, endDate: null };
  }

  const startYear = eraYearToSeireki(link.era, link.eraYear);
  // 12月定例会の閉会が翌年1月になる場合等、会期が年をまたぐケースを考慮する
  const endYear = Number(endMonth) < Number(startMonth) ? startYear + 1 : startYear;

  return {
    startDate: `${startYear}-${pad2(Number(startMonth))}-${pad2(Number(startDay))}`,
    endDate: `${endYear}-${pad2(Number(endMonth))}-${pad2(Number(endDay))}`,
  };
}
