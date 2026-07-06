import * as cheerio from "cheerio";
import { politeFetch } from "./httpClient.js";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

/**
 * さいたま市議会「市議会議員一覧(50音別)」ページのスクレイパー(Phase2、docs/adr/0002)。
 *
 * 対象: https://www.city.saitama.lg.jp/gikai/001/002/001/index.html
 * 氏名・ふりがな・所属会派・プロフィールページURLが1ページに掲載されている。
 *
 * 2026-07-06時点のHTML構造に基づく(docs/adr/0001-architecture-style.md)。
 * 選出区・当選回数・連絡先等は現時点のドメインモデルで使用しないため取得しない(YAGNI)。
 */

const ORIGIN = "https://www.city.saitama.lg.jp";
const INDEX_PATH = "/gikai/001/002/001/index.html";
const FACTION_LABEL = "所属会派";

export interface ScrapedLegislator {
  name: string;
  nameKana: string;
  factionName: string | null;
  profileUrl: string;
}

function normalizeSpaces(text: string): string {
  return text.replace(/[\s　]+/g, " ").trim();
}

export async function listLegislators(): Promise<ScrapedLegislator[]> {
  await assertAllowedByRobotsTxt(ORIGIN, INDEX_PATH);

  const indexUrl = `${ORIGIN}${INDEX_PATH}`;
  const { buffer } = await politeFetch(indexUrl);
  const $ = cheerio.load(buffer.toString("utf-8"));

  const legislators: ScrapedLegislator[] = [];
  $(".member_list li").each((_, element) => {
    const $item = $(element);
    const href = $item.find("a").attr("href");
    const rubyText = $item.find(".ruby").first().text();
    const nameText = $item.find(".name").first().text();
    if (!href || !rubyText.trim() || !nameText.trim()) {
      return;
    }

    let factionName: string | null = null;
    $item.find(".text_area .cf").each((__, row) => {
      const $row = $(row);
      if ($row.find(".text_ttl").text().trim() === FACTION_LABEL) {
        const text = $row.find(".text_cont").text().trim();
        factionName = text.length > 0 ? text : null;
      }
    });

    legislators.push({
      name: normalizeSpaces(nameText),
      nameKana: normalizeSpaces(rubyText),
      factionName,
      profileUrl: new URL(href, indexUrl).toString(),
    });
  });

  return legislators;
}
