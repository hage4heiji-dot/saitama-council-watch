import { unwrapSenketsuTitle } from "../shared/senketsuTitle.js";

/**
 * 予算議案(Bill.title)から、会計名・会計年度・補正号数を抽出し、
 * v1のスコープ(普通会計=一般会計+特別会計)対象かどうかを判定する(docs/adr/0024)。
 *
 * 実データ(令和7〜8年度の全予算議案34パターン)で確認したタイトル書式:
 *   - 当初予算:   "令和8年度さいたま市一般会計予算"
 *   - 補正予算:   "令和8年度さいたま市一般会計補正予算（第1号）"(全角/半角括弧の揺れあり)
 *   - 専決処分:   "専決処分の報告及び承認を求めることについて（令和7年度さいたま市一般会計補正予算（第7号））"
 *   - 公営企業会計(水道事業会計・下水道事業会計・病院事業会計)は「〇〇事業会計」で終わり
 *     「特別会計」を含まない。表形式が全く異なるためv1では除外する(他は「〇〇特別会計」)。
 */

export interface ClassifiedBudgetBill {
  /** 会計名(例: "一般会計", "国民健康保険事業特別会計") */
  accountName: string;
  /** 会計年度(西暦) */
  fiscalYear: number;
  /** 当初予算はnull、補正予算はその号数 */
  amendmentNumber: number | null;
}

const BUDGET_TITLE_PATTERN =
  /^令和(?<eraYear>[0-9０-９]+)年度さいたま市(?<accountName>.+?)(?:当初予算|補正予算|予算)(?:[（(]第(?<amendmentNumber>[0-9０-９]+)号[）)])?$/;

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String(FULL_WIDTH_DIGITS.indexOf(digit)));
}

function isEnterpriseAccount(accountName: string): boolean {
  return !accountName.includes("特別会計") && accountName.endsWith("事業会計");
}

/**
 * 予算議案でない場合、または公営企業会計(v1のスコープ外)の場合はnullを返す(捏造しない)。
 */
export function classifyBudgetBillTitle(title: string): ClassifiedBudgetBill | null {
  const targetTitle = unwrapSenketsuTitle(title);

  const match = BUDGET_TITLE_PATTERN.exec(targetTitle);
  const { eraYear, accountName, amendmentNumber } = match?.groups ?? {};
  if (!eraYear || !accountName) {
    return null;
  }
  if (isEnterpriseAccount(accountName)) {
    return null;
  }

  return {
    accountName,
    // 令和元年=2019年度(docs/design/00-constitution.mdの対象は令和のみ、実データに平成表記なし)
    fiscalYear: 2018 + Number(toHalfWidthDigits(eraYear)),
    amendmentNumber: amendmentNumber ? Number(toHalfWidthDigits(amendmentNumber)) : null,
  };
}
