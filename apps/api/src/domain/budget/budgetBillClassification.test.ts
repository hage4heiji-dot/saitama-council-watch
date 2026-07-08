import { describe, expect, it } from "vitest";
import { classifyBudgetBillTitle } from "./budgetBillClassification.js";

/**
 * 実データ(令和7〜8年度に議決された全予算関連議案34タイトルパターン)から
 * 抽出した回帰テスト(docs/adr/0024)。
 */
describe("classifyBudgetBillTitle", () => {
  it("当初予算のタイトルを解析する", () => {
    expect(classifyBudgetBillTitle("令和8年度さいたま市一般会計予算")).toEqual({
      accountName: "一般会計",
      fiscalYear: 2026,
      amendmentNumber: null,
    });
  });

  it("補正予算のタイトル(全角括弧)を解析する", () => {
    expect(classifyBudgetBillTitle("令和8年度さいたま市一般会計補正予算（第1号）")).toEqual({
      accountName: "一般会計",
      fiscalYear: 2026,
      amendmentNumber: 1,
    });
  });

  it("補正予算のタイトル(半角括弧)を解析する", () => {
    expect(
      classifyBudgetBillTitle("令和8年度さいたま市国民健康保険事業特別会計補正予算(第1号)"),
    ).toEqual({
      accountName: "国民健康保険事業特別会計",
      fiscalYear: 2026,
      amendmentNumber: 1,
    });
  });

  it("全角数字の号数を解析する", () => {
    expect(
      classifyBudgetBillTitle("令和7年度さいたま市指扇土地区画整理事業特別会計補正予算（第３号）"),
    ).toEqual({
      accountName: "指扇土地区画整理事業特別会計",
      fiscalYear: 2025,
      amendmentNumber: 3,
    });
  });

  it("専決処分に包まれた補正予算のタイトルから中身を解析する", () => {
    expect(
      classifyBudgetBillTitle(
        "専決処分の報告及び承認を求めることについて（令和7年度さいたま市一般会計補正予算（第7号））",
      ),
    ).toEqual({
      accountName: "一般会計",
      fiscalYear: 2025,
      amendmentNumber: 7,
    });
  });

  it("特別会計(「事業」を含むが公営企業会計ではない)は対象に含める", () => {
    expect(
      classifyBudgetBillTitle("令和8年度さいたま市食肉中央卸売市場及びと畜場事業特別会計予算"),
    ).toEqual({
      accountName: "食肉中央卸売市場及びと畜場事業特別会計",
      fiscalYear: 2026,
      amendmentNumber: null,
    });
  });

  it.each([
    "令和8年度さいたま市水道事業会計予算",
    "令和8年度さいたま市水道事業会計補正予算（第1号）",
    "令和8年度さいたま市下水道事業会計予算",
    "令和8年度さいたま市病院事業会計当初予算",
    "令和7年度さいたま市病院事業会計補正予算（第3号）",
  ])("公営企業会計「%s」はv1のスコープ外としてnullを返す", (title) => {
    expect(classifyBudgetBillTitle(title)).toBeNull();
  });

  it.each([
    "専決処分の報告及び承認を求めることについて（さいたま市市税条例等の一部を改正する条例の制定について）",
    "議案第18号のようなただの議案",
    "",
  ])("予算議案でないタイトル「%s」はnullを返す", (title) => {
    expect(classifyBudgetBillTitle(title)).toBeNull();
  });
});
