import type { VoteType } from "@saitama-council-watch/shared-types";
import { clusterByX, nearestCluster } from "../shared/xClustering.js";

/**
 * さいたま市議会「議案に対する表決態度」PDFの解析(docs/adr/0017)。
 *
 * このPDFは会派ごとに1つの記号(賛成〇・反対×・欠席欠・退席退・除斥除)が
 * 印字された表形式で、無所属議員のみ個人単位の列を持つ。pdf-parseの既定の
 * テキスト結合では列位置(=どの会派/議員の記号か)の情報が失われるため、
 * X/Y座標付きのテキスト抽出(extractPositionedPdfText)を前提とする。
 *
 * 会派の記号がその会派の「基本の議決」を表し、特定議員が欠席・退席等だった
 * 場合のみ「（欠：氏名1、氏名2）」のような注記で個別に上書きされる
 * (実データ: 令和8年2月定例会 議案表決態度一覧で確認済み)。
 */

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

export interface KnownLegislator {
  id: string;
  /** DB保存名("姓　名"形式)。空白の有無は問わない(比較時に除去する) */
  name: string;
}

export interface BillVoteResult {
  /** 例: "第1号" */
  billNumber: string;
  /** 議決月日(月・日のみ)。呼び出し側で会期の暦年と組み合わせてISO日付にする */
  decidedOn: { month: number; day: number } | null;
  votes: { legislatorId: string; voteType: VoteType }[];
}

const VOTE_SYMBOLS = ["〇", "○", "×", "欠", "退", "除"] as const;
type VoteSymbol = (typeof VOTE_SYMBOLS)[number];

const SYMBOL_TO_VOTE_TYPE: Record<VoteSymbol, VoteType> = {
  "〇": "for",
  "○": "for",
  "×": "against",
  欠: "absent",
  // 退席・除斥は現行VoteTypeに厳密な対応がないため、議決に加わらなかった
  // という点でabsent/abstainに近似する(docs/adr/0017で明記する簡略化)。
  退: "absent",
  除: "abstain",
};

const BILL_HEADING_PATTERN = /^議案第(?<num>[0-9０-９]+)号$/;
const CHAIR_EXCLUSION_PATTERN = /議長[:：](?<name>.+?)議員は除く/;
const EXCEPTION_PATTERN = /^[（(](?<symbol>欠|退|除)[:：](?<names>.+?)[)）]$/;

function stripWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String(FULL_WIDTH_DIGITS.indexOf(digit)));
}

/** 議長(表決に加わらない)の氏名を抽出する。見つからなければnull */
export function findChairName(items: PositionedTextItem[]): string | null {
  for (const item of items) {
    const match = CHAIR_EXCLUSION_PATTERN.exec(item.str);
    if (match?.groups?.name) {
      return match.groups.name.trim();
    }
  }
  return null;
}

const DATE_PATTERN = /^(?<month>[0-9０-９]+)月(?<day>[0-9０-９]+)日$/;

/**
 * ヘッダー(「議　決」「月　日」)のX座標を手がかりに、「議決月日」列のX座標を求める。
 * 同じ表に「提出月日」列(別のX座標)もあるため、列を取り違えないようにする。
 */
function findDecisionDateColumnX(items: PositionedTextItem[]): number | null {
  const decisionLabel = items.find((item) => item.str.trim() === "議　決" || item.str.trim() === "議決");
  return decisionLabel?.x ?? null;
}

/**
 * ページ内の「名簿ブロック」(各会派・無所属議員の氏名一覧)を抽出する。
 * 各ページで最初に現れる「議案第N号」より上にある項目を名簿とみなす
 * (表決態度PDFは各ページの先頭に会派・議員の見出しを繰り返す構成のため)。
 */
function extractRosterItems(items: PositionedTextItem[]): PositionedTextItem[] {
  const byPage = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    const pageItems = byPage.get(item.page) ?? [];
    pageItems.push(item);
    byPage.set(item.page, pageItems);
  }

  const roster: PositionedTextItem[] = [];
  for (const pageItems of byPage.values()) {
    const firstBillItem = pageItems.find((item) => BILL_HEADING_PATTERN.test(item.str.trim()));
    if (!firstBillItem) {
      continue;
    }
    roster.push(...pageItems.filter((item) => item.y > firstBillItem.y));
  }
  return roster;
}

/**
 * 名簿ブロックと実際の議員データを突き合わせ、各議員がどの議決記号列に
 * 対応するかを求める(議長は表決に加わらないため除外する)。
 */
export function buildLegislatorColumnMap(
  items: PositionedTextItem[],
  legislators: KnownLegislator[],
): Map<string, number> {
  const chairName = findChairName(items);
  const chairStripped = chairName ? stripWhitespace(chairName) : null;

  const roster = extractRosterItems(items);
  const legislatorRosterX = new Map<string, number>();
  for (const item of roster) {
    const combined = stripWhitespace(item.str);
    for (const legislator of legislators) {
      if (chairStripped && stripWhitespace(legislator.name) === chairStripped) {
        continue;
      }
      if (combined.includes(stripWhitespace(legislator.name))) {
        if (!legislatorRosterX.has(legislator.id)) {
          legislatorRosterX.set(legislator.id, item.x);
        }
      }
    }
  }

  const rosterClusters = clusterByX([...legislatorRosterX.values()], 10);

  const voteSymbolXs = items
    .filter((item) => (VOTE_SYMBOLS as readonly string[]).includes(item.str.trim()))
    .map((item) => item.x);
  const voteClusters = clusterByX(voteSymbolXs, 10).sort((a, b) => a - b);

  const sortedRosterClusters = [...rosterClusters].sort((a, b) => a - b);
  const rosterToVoteColumn = new Map<number, number>();
  sortedRosterClusters.forEach((rosterX, index) => {
    const voteX = voteClusters[index];
    if (voteX !== undefined) {
      rosterToVoteColumn.set(rosterX, voteX);
    }
  });

  const result = new Map<string, number>();
  for (const [legislatorId, rosterX] of legislatorRosterX) {
    const cluster = nearestCluster(rosterX, sortedRosterClusters);
    const voteColumnX = rosterToVoteColumn.get(cluster);
    if (voteColumnX !== undefined) {
      result.set(legislatorId, voteColumnX);
    }
  }
  return result;
}

interface BillBlock {
  billNumber: string;
  items: PositionedTextItem[];
}

/**
 * ページごとに「議案第N号」の出現位置で区切り、各議案のブロックを取り出す。
 * 会派列によっては同じ行でもY座標が数pt前後にずれる(実データで確認済み: 公明党列は
 * 見出しより+2.6pt高い位置に記号が来る等)。単純な範囲区切りだとこの数ptのズレで
 * 前の議案のブロックに紛れ込んでしまうため、各項目は「Y距離が最も近い見出し」に
 * 割り当てる(見出し同士の間隔は約29ptあり、数pt程度のズレでは誤割り当てされない)。
 */
function extractBillBlocks(items: PositionedTextItem[]): BillBlock[] {
  const byPage = new Map<number, PositionedTextItem[]>();
  for (const item of items) {
    const pageItems = byPage.get(item.page) ?? [];
    pageItems.push(item);
    byPage.set(item.page, pageItems);
  }

  const blocks: BillBlock[] = [];
  for (const pageItems of byPage.values()) {
    const headings = pageItems.filter((item) => BILL_HEADING_PATTERN.test(item.str.trim()));
    if (headings.length === 0) {
      continue;
    }

    const blockItemsByHeadingIndex: PositionedTextItem[][] = headings.map(() => []);
    for (const item of pageItems) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      headings.forEach((heading, index) => {
        const distance = Math.abs(item.y - heading.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      blockItemsByHeadingIndex[nearestIndex]!.push(item);
    }

    headings.forEach((heading, index) => {
      const match = BILL_HEADING_PATTERN.exec(heading.str.trim());
      const num = match?.groups?.num;
      if (!num) {
        return;
      }
      blocks.push({
        billNumber: `第${toHalfWidthDigits(num)}号`,
        items: blockItemsByHeadingIndex[index]!,
      });
    });
  }
  return blocks;
}

/** 議案ブロック内の例外注記(「（欠：氏名1、氏名2）」等)を解析する */
function parseExceptions(
  blockItems: PositionedTextItem[],
  legislators: KnownLegislator[],
): Map<string, VoteSymbol> {
  const overrides = new Map<string, VoteSymbol>();
  for (const item of blockItems) {
    const match = EXCEPTION_PATTERN.exec(item.str.trim());
    if (!match?.groups?.symbol || !match.groups.names) {
      continue;
    }
    const symbol = match.groups.symbol as VoteSymbol;
    const names = match.groups.names.split(/[、・,]/).map((name) => stripWhitespace(name));
    for (const name of names) {
      const legislator = legislators.find((l) => stripWhitespace(l.name) === name);
      if (legislator) {
        overrides.set(legislator.id, symbol);
      }
    }
  }
  return overrides;
}

export function parseVoteStancePdf(
  items: PositionedTextItem[],
  legislators: KnownLegislator[],
): BillVoteResult[] {
  const columnMap = buildLegislatorColumnMap(items, legislators);
  const voteColumns = [...new Set(columnMap.values())];
  const blocks = extractBillBlocks(items);
  const decisionDateColumnX = findDecisionDateColumnX(items);

  return blocks.map((block) => {
    const baselineBySymbolX = new Map<number, VoteSymbol>();
    for (const item of block.items) {
      const trimmed = item.str.trim();
      if ((VOTE_SYMBOLS as readonly string[]).includes(trimmed)) {
        const column = nearestCluster(item.x, voteColumns);
        baselineBySymbolX.set(column, trimmed as VoteSymbol);
      }
    }

    const overrides = parseExceptions(block.items, legislators);

    const votes: { legislatorId: string; voteType: VoteType }[] = [];
    for (const [legislatorId, voteColumnX] of columnMap) {
      const symbol = overrides.get(legislatorId) ?? baselineBySymbolX.get(voteColumnX);
      if (!symbol) {
        // 記号が見つからない(想定外の書式・抽出漏れ)場合は捏造を避けて記録しない
        continue;
      }
      votes.push({ legislatorId, voteType: SYMBOL_TO_VOTE_TYPE[symbol] });
    }

    const dateCandidates = block.items.filter((item) => DATE_PATTERN.test(item.str.trim()));
    const dateItem =
      decisionDateColumnX !== null && dateCandidates.length > 0
        ? dateCandidates.reduce((best, candidate) =>
            Math.abs(candidate.x - decisionDateColumnX) < Math.abs(best.x - decisionDateColumnX)
              ? candidate
              : best,
          )
        : null;
    const dateMatch = dateItem ? DATE_PATTERN.exec(dateItem.str.trim()) : null;
    const decidedOn =
      dateMatch?.groups?.month && dateMatch.groups.day
        ? { month: Number(toHalfWidthDigits(dateMatch.groups.month)), day: Number(toHalfWidthDigits(dateMatch.groups.day)) }
        : null;

    return { billNumber: block.billNumber, decidedOn, votes };
  });
}
