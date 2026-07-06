import type { BillStatus } from "@saitama-council-watch/shared-types";

/**
 * さいたま市議会資料検索システム(Discuss Cabinet)が公開する
 * 「委員会審査結果報告一覧」「議案審議結果一覧」PDFのテキスト解析(docs/adr/0016)。
 *
 * pdf-parseはテーブルを行単位でなく列(番号列→件名列→結果列)ごとにまとめて
 * 抽出するため、単純に行N↔行Nで対応させることはできない。
 * このため「項番号の並び」と「結果キーワードの並び」をそれぞれ収集し、
 * 件数が一致する区間だけを対応付ける(件数が合わない場合は捏造を避けるため解決しない)。
 */

export interface DeliberationResultItem {
  kind: "議案" | "請願";
  /** 例: "第112号" */
  billNumber: string;
  resultText: string;
}

const RESULT_KEYWORDS = [
  "原案可決",
  "可決",
  "原案否決",
  "否決",
  "継続審査",
  "継続審議",
  "承認",
  "不採択",
  "取下げ",
];

// 委員会審査結果報告一覧: 「議案第１１２号」「請願第　７号」のように必ず種別接頭辞が付く。
// 接頭辞を必須にしないと、件名中の「（第１号）」(補正予算の回次表記等、議案番号ではない)を
// 誤って議案番号と認識してしまう(実データで発生を確認済み)。
const COMMITTEE_REPORT_ITEM_PATTERN = /(?<kind>議案|請願)第\s*(?<num>[0-9０-９]+)\s*号/;

// 議案審議結果一覧(専決処分の承認等): 種別接頭辞がなく「第106号」のみが単独行で現れる。
// 他の行(件名・日付等)との混同を避けるため、行全体が番号のみであることを要求する。
const SESSION_SUMMARY_ITEM_PATTERN = /^第\s*(?<num>[0-9０-９]+)\s*号$/;

function stripWhitespace(line: string): string {
  return line.replace(/[\s　]/g, "");
}

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";

function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String(FULL_WIDTH_DIGITS.indexOf(digit)));
}

/**
 * @param format
 *   "committee_report": 委員会審査結果報告一覧(件名ごとに議案/請願の種別接頭辞が付く)
 *   "session_summary": 議案審議結果一覧(専決処分の承認等。種別接頭辞なし、議案のみを対象とする文書)
 */
export function parseDeliberationResultText(
  rawText: string,
  format: "committee_report" | "session_summary" = "committee_report",
): DeliberationResultItem[] {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const resolved: DeliberationResultItem[] = [];
  let pendingItems: { kind: "議案" | "請願"; billNumber: string }[] = [];
  let pendingResults: string[] = [];

  const flush = (): void => {
    if (pendingItems.length > 0 && pendingItems.length === pendingResults.length) {
      pendingItems.forEach((item, index) => {
        const resultText = pendingResults[index];
        if (resultText) {
          resolved.push({ ...item, resultText });
        }
      });
    }
    // 件数が一致しない区間は捏造を避けるため何も解決しない(該当議案は呼び出し側でunconfirmed扱いになる)
    pendingItems = [];
    pendingResults = [];
  };

  for (const line of lines) {
    const stripped = stripWhitespace(line);

    const exactKeyword = RESULT_KEYWORDS.find((keyword) => stripped === keyword);
    if (exactKeyword) {
      pendingResults.push(exactKeyword);
      continue;
    }

    const itemMatch =
      format === "committee_report"
        ? COMMITTEE_REPORT_ITEM_PATTERN.exec(line)
        : SESSION_SUMMARY_ITEM_PATTERN.exec(line);
    const inlineKeyword = RESULT_KEYWORDS.find(
      (keyword) => stripped.length > keyword.length && stripped.endsWith(keyword),
    );

    if (inlineKeyword && itemMatch?.groups?.num) {
      resolved.push({
        kind: itemMatch.groups.kind === "請願" ? "請願" : "議案",
        billNumber: `第${toHalfWidthDigits(itemMatch.groups.num)}号`,
        resultText: inlineKeyword,
      });
      continue;
    }

    if (itemMatch?.groups?.num) {
      if (pendingResults.length > 0) {
        flush();
      }
      pendingItems.push({
        kind: itemMatch.groups.kind === "請願" ? "請願" : "議案",
        billNumber: `第${toHalfWidthDigits(itemMatch.groups.num)}号`,
      });
    }
    // それ以外(件名・日付等)は無視
  }
  flush();

  return resolved;
}

/**
 * 審査結果の原文を BillStatus にマッピングする。
 * 未知の結果文言(想定外の表記揺れ等)は「passed/rejected等と断定できない」ことを
 * 明示するため null を返す(呼び出し側でunconfirmed扱いにする。捏造しないという方針)。
 */
export function mapDeliberationResultToStatus(resultText: string): BillStatus | null {
  switch (resultText) {
    case "原案可決":
    case "可決":
    case "承認": // 専決処分の報告に対する承認。実質的に可決と同義
      return "passed";
    case "原案否決":
    case "否決":
      return "rejected";
    case "継続審査":
    case "継続審議":
      return "carried_over";
    default:
      // 「取下げ」等、現行BillStatusで表現できない結果を含む
      return null;
  }
}
