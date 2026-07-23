import * as cheerio from "cheerio";
import type { Era } from "./eraDate.js";
import { politeFetch } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会議員選挙「得票数及び当選人」PDFのスクレイパー(docs/adr/0027)。
 *
 * 索引ページ(例: /006/009/kakonosenkyokekka/p018209.html)は複数回の選挙(統一地方選挙+
 * 補欠選挙)を1ページにまとめて掲載しており、リンクのテキスト自体には年度が
 * 含まれない(常に「得票数及び当選人（PDF形式：◯◯KB）」)。実際のHTML構造を確認したところ、
 * 「<h2>平成15年4月13日執行</h2>」という見出しの後、「<h3>開票結果</h3>」に続く
 * 段落内のリンクが対象PDFである(2026-07-23時点で確認)。PDFのURL自体(p018209_d配下の
 * ファイル名)はCMSの内部的な命名でいつ変わるか分からないため、URLを直接ハードコードせず
 * 年度見出しから辿って解決する。
 */

const ORIGIN = "https://www.city.saitama.lg.jp";
const RESULT_LINK_TEXT_PATTERN = /得票数及び当選人/;

export interface ElectionResultQuery {
  era: Era;
  eraYear: number;
  /** この選挙の実データが掲載されている索引ページのパス(複数選挙をまとめて掲載するページもある) */
  indexPagePath: string;
}

export interface ScrapedElectionResultDocument {
  pdfBuffer: Buffer;
  sourceUrl: string;
}

export async function fetchElectionResultPdf(query: ElectionResultQuery): Promise<ScrapedElectionResultDocument> {
  await assertAllowedByRobotsTxt(ORIGIN, query.indexPagePath);
  const indexUrl = `${ORIGIN}${query.indexPagePath}`;
  const { buffer } = await politeFetch(indexUrl);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const yearLabel = `${query.era}${query.eraYear}年`;
  let currentHeading = "";
  let pdfUrl: string | null = null;

  $("h2, a").each((_, element) => {
    if (pdfUrl) {
      return;
    }
    const $el = $(element);
    if (element.tagName?.toLowerCase() === "h2") {
      currentHeading = $el.text().trim();
      return;
    }
    if (currentHeading.includes(yearLabel) && RESULT_LINK_TEXT_PATTERN.test($el.text())) {
      const href = $el.attr("href");
      if (href?.endsWith(".pdf")) {
        pdfUrl = new URL(href, indexUrl).toString();
      }
    }
  });

  if (!pdfUrl) {
    throw new Error(`索引ページに${yearLabel}の「得票数及び当選人」PDFリンクが見つかりません: ${indexUrl}`);
  }

  await assertAllowedByRobotsTxt(ORIGIN, new URL(pdfUrl).pathname);
  const { buffer: pdfBuffer } = await politeFetch(pdfUrl);
  return { pdfBuffer, sourceUrl: pdfUrl };
}
