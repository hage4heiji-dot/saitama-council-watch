import type { BudgetCategory } from "./budgetTableParsing.js";

/**
 * 会計年度・会計(一般会計/各特別会計)ごとに、当初予算を基準として補正予算を
 * 提出日順に適用し、款ごとの最新の金額を求める(docs/adr/0024の「積み上げ」)。
 *
 * 補正予算の表には変更のあった款のみが載る(実データで確認済み)ため、単純に最新の
 * 議案だけを見ればよいわけではない。当初予算をベースラインとして、款ごとに
 * 新しい議案の金額で上書きしていく必要がある。
 */

export interface BudgetBillInput {
  billId: string;
  accountName: string;
  fiscalYear: number;
  /** 当初予算はnull、補正予算はその号数(docs/adr/0024の会計分類ロジックの出力) */
  amendmentNumber: number | null;
  /** 順序判定の補助(号数が同じ・ない場合のタイブレークに使う) */
  submittedDate: string | null;
  categories: BudgetCategory[];
}

export interface AggregatedBudgetCategory {
  accountName: string;
  fiscalYear: number;
  categoryNumber: string;
  categoryName: string;
  amountYen: number;
  /** 項単位の内訳を原本の表記のまま連結したもの(捏造しない、docs/design/00-constitution.md) */
  description: string;
  /** この金額の根拠になった最新の議案 */
  sourceBillId: string;
}

function billOrderKey(bill: BudgetBillInput): [number, string] {
  // 当初予算(amendmentNumber === null)を0番目とし、補正予算はその号数で並べる
  const order = bill.amendmentNumber ?? 0;
  return [order, bill.submittedDate ?? ""];
}

function compareBills(a: BudgetBillInput, b: BudgetBillInput): number {
  const [orderA, dateA] = billOrderKey(a);
  const [orderB, dateB] = billOrderKey(b);
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return dateA.localeCompare(dateB);
}

function formatDescription(category: BudgetCategory): string {
  return category.subItems
    .map((item) => `${item.name} ${Math.round(item.amountYen / 1000).toLocaleString("ja-JP")}千円`)
    .join("、");
}

export function aggregateBudget(bills: BudgetBillInput[]): AggregatedBudgetCategory[] {
  const groups = new Map<string, BudgetBillInput[]>();
  for (const bill of bills) {
    const key = `${bill.fiscalYear} ${bill.accountName}`;
    const group = groups.get(key) ?? [];
    group.push(bill);
    groups.set(key, group);
  }

  const results: AggregatedBudgetCategory[] = [];

  for (const group of groups.values()) {
    const sortedBills = [...group].sort(compareBills);
    const byCategory = new Map<string, AggregatedBudgetCategory>();

    for (const bill of sortedBills) {
      for (const category of bill.categories) {
        byCategory.set(category.categoryNumber, {
          accountName: bill.accountName,
          fiscalYear: bill.fiscalYear,
          categoryNumber: category.categoryNumber,
          categoryName: category.categoryName,
          amountYen: category.amountYen,
          description: formatDescription(category),
          sourceBillId: bill.billId,
        });
      }
    }

    results.push(...byCategory.values());
  }

  return results;
}
