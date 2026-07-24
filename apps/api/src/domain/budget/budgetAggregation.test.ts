import { describe, expect, it } from "vitest";
import { aggregateBudget, type BudgetBillInput } from "./budgetAggregation.js";

/**
 * 実データの形(議案第18号 令和8年度一般会計予算 → 議案第108号 補正予算(第1号))を模した
 * 合成データ。補正予算は変更のあった款(総務費・民生費)のみを含み、変更のない款(議会費)は
 * 当初予算の値のままになることを確認する(docs/adr/0024)。
 */
const initialBudget: BudgetBillInput = {
  billId: "bill-initial",
  accountName: "一般会計",
  fiscalYear: 2026,
  amendmentNumber: null,
  submittedDate: "2026-02-03",
  categories: [
    { categoryNumber: "1", categoryName: "議会費", amountYen: 1_738_979_000, subItems: [] },
    {
      categoryNumber: "2",
      categoryName: "総務費",
      amountYen: 66_627_306_000,
      subItems: [{ name: "総務管理費", amountYen: 36_400_073_000 }],
    },
    { categoryNumber: "3", categoryName: "民生費", amountYen: 283_610_456_000, subItems: [] },
  ],
};

const amendment1: BudgetBillInput = {
  billId: "bill-amendment-1",
  accountName: "一般会計",
  fiscalYear: 2026,
  amendmentNumber: 1,
  submittedDate: "2026-06-03",
  categories: [
    {
      categoryNumber: "2",
      categoryName: "総務費",
      amountYen: 67_295_870_000,
      subItems: [{ name: "総務管理費", amountYen: 36_419_261_000 }],
    },
    { categoryNumber: "3", categoryName: "民生費", amountYen: 283_810_146_000, subItems: [] },
  ],
};

describe("aggregateBudget", () => {
  it("補正予算で変更のあった款は最新の金額に、変更のない款は当初予算のままにする", () => {
    const result = aggregateBudget([amendment1, initialBudget]);
    const byNumber = new Map(result.map((r) => [r.categoryNumber, r]));

    expect(byNumber.get("1")).toMatchObject({
      categoryName: "議会費",
      amountYen: 1_738_979_000,
      sourceBillId: "bill-initial",
    });
    expect(byNumber.get("2")).toMatchObject({
      categoryName: "総務費",
      amountYen: 67_295_870_000,
      sourceBillId: "bill-amendment-1",
    });
    expect(byNumber.get("3")).toMatchObject({
      categoryName: "民生費",
      amountYen: 283_810_146_000,
      sourceBillId: "bill-amendment-1",
    });
  });

  it("入力の順序によらず、当初予算→補正予算の順に適用する(号数順)", () => {
    const forward = aggregateBudget([initialBudget, amendment1]);
    const backward = aggregateBudget([amendment1, initialBudget]);
    expect(forward).toEqual(backward);
  });

  it("項の内訳を千円単位の説明文として保持する(捏造しない)", () => {
    const result = aggregateBudget([initialBudget, amendment1]);
    const soumu = result.find((r) => r.categoryNumber === "2");
    expect(soumu?.description).toBe("総務管理費 36,419,261千円");
  });

  it("会計(accountName)が異なれば別々に集計する", () => {
    const otherAccount: BudgetBillInput = {
      ...initialBudget,
      billId: "bill-kokuho",
      accountName: "国民健康保険事業特別会計",
      categories: [{ categoryNumber: "2", categoryName: "総務費", amountYen: 1_000_000, subItems: [] }],
    };
    const result = aggregateBudget([initialBudget, otherAccount]);
    const generalSoumu = result.find((r) => r.accountName === "一般会計" && r.categoryNumber === "2");
    const kokuhoSoumu = result.find(
      (r) => r.accountName === "国民健康保険事業特別会計" && r.categoryNumber === "2",
    );
    expect(generalSoumu?.amountYen).toBe(66_627_306_000);
    expect(kokuhoSoumu?.amountYen).toBe(1_000_000);
  });
});
