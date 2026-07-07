import * as cheerio from "cheerio";
import { politeFetch } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会「議案に対する表決態度」ページのスクレイパー(docs/adr/0017)。
 *
 * 対象:
 *   - 一覧ページ: https://www.city.saitama.lg.jp/gikai/003/002/hyouketutaido/index.html
 *   - 期間別ページ(例: 「令和8年2月以降」)の「関連ダウンロードファイル」からPDFを取得する
 *
 * 2026-07-07時点のHTML構造に基づく。サイト構造が変わった場合の影響は
 * このファイルに閉じ込める(docs/adr/0001-architecture-style.md)。
 * 直近の期間(リンクテキストに「以降」を含むもの)のみを対象とする。
 */

const ORIGIN = "https://www.city.saitama.lg.jp";
const INDEX_PATH = "/gikai/003/002/hyouketutaido/index.html";

/**
 * 指定した会期(例: "令和8年2月定例会")の議案表決態度PDFを取得する。
 * 該当するPDFがまだ公開されていない場合はnullを返す(捏造しない)。
 */
export async function fetchVoteStancePdf(sessionLabel: string): Promise<Buffer | null> {
  await assertAllowedByRobotsTxt(ORIGIN, INDEX_PATH);

  const indexUrl = `${ORIGIN}${INDEX_PATH}`;
  const { buffer: indexBuffer } = await politeFetch(indexUrl);
  const $index = cheerio.load(indexBuffer.toString("utf-8"));

  // 直近の期間ページのリンクテキストは「議案表決態度一覧（令和8年2月～）」のように
  // 開始年月のみを示す(終了年月を示さない)開区間表記になっている(実サイトで確認済み)。
  let periodUrl: string | null = null;
  $index("a").each((_, element) => {
    if (periodUrl) {
      return;
    }
    const text = $index(element).text();
    const href = $index(element).attr("href");
    if (href && /～[）)]/.test(text)) {
      periodUrl = new URL(href, indexUrl).toString();
    }
  });
  if (!periodUrl) {
    return null;
  }

  const { buffer: periodBuffer } = await politeFetch(periodUrl);
  const $period = cheerio.load(periodBuffer.toString("utf-8"));

  let pdfUrl: string | null = null;
  $period("a[href$='.pdf']").each((_, element) => {
    if (pdfUrl) {
      return;
    }
    const text = $period(element).text();
    const href = $period(element).attr("href");
    if (href && text.includes(sessionLabel)) {
      pdfUrl = new URL(href, periodUrl as string).toString();
    }
  });
  if (!pdfUrl) {
    return null;
  }

  const { buffer } = await politeFetch(pdfUrl);
  return buffer;
}
