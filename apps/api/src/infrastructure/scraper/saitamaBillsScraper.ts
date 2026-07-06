import * as cheerio from "cheerio";
import { politeFetch } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会「市長提出議案」ページのスクレイパー(docs/adr/0002)。
 *
 * 対象:
 *   - セッション一覧: https://www.city.saitama.lg.jp/006/007/002/001/index.html
 *   - セッション詳細(議案PDFリンク一覧): 例) .../018/p131034.html
 *
 * 2026-07-06時点のHTML構造に基づく。サイト構造が変わった場合の影響は
 * このファイルに閉じ込める(docs/adr/0001-architecture-style.md)。
 */

const ORIGIN = "https://www.city.saitama.lg.jp";
const BILLS_INDEX_PATH = "/006/007/002/001/index.html";

const SESSION_CORE_PATTERN =
  /^(?<core>(?<era>令和|平成)(?<eraYear>\d+)年(?<month>\d+)月(?:（[^）]*）)?(?:定例会|臨時会))/;
const BILL_LINK_PATTERN = /^議案第(?<number>\S+?)号\s*(?<title>.+)$/;
const PDF_SIZE_SUFFIX_PATTERN = /[(（]PDF形式[^)）]*[)）]\s*$/;
const SUBMITTED_DATE_HEADING_PATTERN = /(?<month>\d+)月(?<day>\d+)日提出議案/;

export interface ScrapedSessionLink {
  /** 例: "令和8年6月定例会"(複数バッチ提出でも共通の会期名) */
  sessionName: string;
  /** 例: "令和8年6月定例会 市長提出議案 その1"(リンクテキスト全体) */
  batchLabel: string;
  detailUrl: string;
  era: "令和" | "平成";
  eraYear: number;
}

export interface ScrapedBill {
  billNumber: string;
  title: string;
  pdfUrl: string;
}

export interface ScrapedSessionBills {
  bills: ScrapedBill[];
  /** 原本ページの見出しから解析できた場合のみISO日付を返す。解析できなければnull */
  submittedDate: string | null;
}

function eraYearToSeireki(era: "令和" | "平成", eraYear: number): number {
  return era === "令和" ? 2018 + eraYear : 1988 + eraYear;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** セッション一覧ページから各バッチへのリンクを取得する */
export async function listSessionLinks(): Promise<ScrapedSessionLink[]> {
  await assertAllowedByRobotsTxt(ORIGIN, BILLS_INDEX_PATH);

  const indexUrl = `${ORIGIN}${BILLS_INDEX_PATH}`;
  const { buffer } = await politeFetch(indexUrl);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const links: ScrapedSessionLink[] = [];
  $("ul.ul_contents_list01 li a").each((_, element) => {
    const href = $(element).attr("href");
    const text = $(element).text().trim();
    if (!href || !text) {
      return;
    }

    const match = SESSION_CORE_PATTERN.exec(text);
    const { core, era, eraYear } = match?.groups ?? {};
    if (!core || !era || !eraYear) {
      return;
    }

    links.push({
      sessionName: core,
      batchLabel: text,
      detailUrl: new URL(href, indexUrl).toString(),
      era: era as "令和" | "平成",
      eraYear: Number(eraYear),
    });
  });

  return links;
}

/** セッション詳細ページから議案(番号・件名・PDFリンク)を取得する */
export async function fetchSessionBills(link: ScrapedSessionLink): Promise<ScrapedSessionBills> {
  const { buffer } = await politeFetch(link.detailUrl);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const bills: ScrapedBill[] = [];
  $("a[href$='.pdf']").each((_, element) => {
    const href = $(element).attr("href");
    const rawText = $(element).text().trim();
    if (!href) {
      return;
    }

    const cleanedText = rawText.replace(PDF_SIZE_SUFFIX_PATTERN, "").trim();
    const match = BILL_LINK_PATTERN.exec(cleanedText);
    const { number, title } = match?.groups ?? {};
    if (!number || !title) {
      // 「提出議案一覧」「議案書(一括ダウンロード)」等、個別議案でないリンクはスキップ
      return;
    }

    bills.push({
      billNumber: `第${number}号`,
      title: title.trim(),
      pdfUrl: new URL(href, link.detailUrl).toString(),
    });
  });

  const headingText = $(".wysiwyg_area h2").first().text();
  const dateMatch = SUBMITTED_DATE_HEADING_PATTERN.exec(headingText);
  const { month: monthText, day: dayText } = dateMatch?.groups ?? {};
  let submittedDate: string | null = null;
  if (monthText && dayText) {
    // 会期の暦年(sessionNameのera/eraYear由来)と、このバッチ固有の月日(見出し由来)を組み合わせる。
    // 会期が年をまたぐ場合(例: 12月定例会の追加提出が翌年1月)は非対応(既知の制約)。
    const calendarYear = eraYearToSeireki(link.era, link.eraYear);
    submittedDate = `${calendarYear}-${pad2(Number(monthText))}-${pad2(Number(dayText))}`;
  }

  return { bills, submittedDate };
}
