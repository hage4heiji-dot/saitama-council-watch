import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseExpenditureBudgetTable,
  parseRevenueBudgetTable,
  type PositionedTextItem,
} from "./budgetTableParsing.js";

const fixtureDir = fileURLToPath(new URL("./__fixtures__/", import.meta.url));

/**
 * 実データ(議案第18号 令和8年度さいたま市一般会計予算、当初予算)から抽出した
 * 座標付きテキスト全ページ分。金額は原本(PDF)を目視で確認済み(docs/adr/0024)。
 */
const initialBudgetItems: PositionedTextItem[] = JSON.parse(
  readFileSync(`${fixtureDir}generalAccountInitialBudgetR8018.json`, "utf-8"),
);

/**
 * 実データ(議案第108号 令和8年度さいたま市一般会計補正予算(第1号))から抽出した
 * 座標付きテキスト(該当ページのみ)。補正予算は変更のあった款のみが表に載る。
 */
const amendmentBudgetItems: PositionedTextItem[] = JSON.parse(
  readFileSync(`${fixtureDir}generalAccountAmendmentBudgetR8108.json`, "utf-8"),
);

/**
 * 実データ(議案第138号 令和8年度さいたま市一般会計補正予算(第2号))から抽出した
 * 座標付きテキスト。款が少なく(4款)、金額列の境界をデータ行の金額から推定する方式
 * (出現頻度・ギャップ検出)では列を誤検出することが判明したケース(docs/adr/0024)。
 */
const amendment2BudgetItems: PositionedTextItem[] = JSON.parse(
  readFileSync(`${fixtureDir}generalAccountAmendment2BudgetR8138.json`, "utf-8"),
);

/**
 * 実データ(議案第19号 令和8年度さいたま市国民健康保険事業特別会計予算、当初予算)から
 * 抽出した座標付きテキスト。歳出見出しが「歳　出」(先頭に空白なし)という、他の議案の
 * 「　歳　出」(先頭にも空白あり)とは異なる表記のケース(docs/adr/0024)。
 */
const kokuhoInitialBudgetItems: PositionedTextItem[] = JSON.parse(
  readFileSync(`${fixtureDir}kokuhoInitialBudgetR8019.json`, "utf-8"),
);

describe("parseExpenditureBudgetTable", () => {
  it("当初予算: 歳出13款すべてを、合計と一致する金額で抽出する", () => {
    const categories = parseExpenditureBudgetTable(initialBudgetItems);
    expect(categories).toHaveLength(13);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("1")).toMatchObject({ categoryName: "議会費", amountYen: 1_738_979_000 });
    expect(byNumber.get("2")).toMatchObject({ categoryName: "総務費", amountYen: 66_627_306_000 });
    expect(byNumber.get("3")).toMatchObject({ categoryName: "民生費", amountYen: 283_610_456_000 });
    expect(byNumber.get("10")).toMatchObject({ categoryName: "教育費", amountYen: 120_141_080_000 });
    expect(byNumber.get("13")).toMatchObject({ categoryName: "予備費", amountYen: 200_000_000 });

    const total = categories.reduce((sum, c) => sum + c.amountYen, 0);
    expect(total).toBe(716_000_000_000);
  });

  it("当初予算: 款の項(サブ項目)を原本の表記のまま保持する", () => {
    const categories = parseExpenditureBudgetTable(initialBudgetItems);
    const soumu = categories.find((c) => c.categoryNumber === "2");
    expect(soumu?.subItems).toHaveLength(10);
    expect(soumu?.subItems[0]).toEqual({ name: "総務管理費", amountYen: 36_400_073_000 });
  });

  it("補正予算: 変更のあった款のみを、補正後の「計」列の金額で抽出する", () => {
    const categories = parseExpenditureBudgetTable(amendmentBudgetItems);
    expect(categories).toHaveLength(6);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("2")).toMatchObject({ categoryName: "総務費", amountYen: 67_295_870_000 });
    expect(byNumber.get("3")).toMatchObject({ categoryName: "民生費", amountYen: 283_810_146_000 });
    expect(byNumber.get("10")).toMatchObject({ categoryName: "教育費", amountYen: 120_154_453_000 });

    // 総計行(歳出合計)はカテゴリとして含まれない
    expect([...byNumber.values()].some((c) => c.categoryName === "歳出")).toBe(false);
  });

  it("見出しが見つからない場合は空配列を返す(捏造しない)", () => {
    const items: PositionedTextItem[] = [{ str: "無関係", x: 0, y: 0, page: 1 }];
    expect(parseExpenditureBudgetTable(items)).toEqual([]);
  });

  it("款が少ない補正予算でも、金額列の境界をヘッダー行の位置から正しく求める", () => {
    const categories = parseExpenditureBudgetTable(amendment2BudgetItems);
    expect(categories).toHaveLength(4);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("3")).toMatchObject({ categoryName: "民生費", amountYen: 283_860_141_000 });
    expect(byNumber.get("4")).toMatchObject({ categoryName: "衛生費", amountYen: 58_369_588_000 });
    expect(byNumber.get("6")).toMatchObject({ categoryName: "農林水産業費", amountYen: 3_287_242_000 });
    expect(byNumber.get("7")).toMatchObject({ categoryName: "商工費", amountYen: 26_070_601_000 });
  });

  it("見出しの表記揺れ(「歳　出」、先頭に空白なし)にも対応する", () => {
    const categories = parseExpenditureBudgetTable(kokuhoInitialBudgetItems);
    expect(categories).toHaveLength(7);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("1")).toMatchObject({ categoryName: "総務費", amountYen: 1_532_818_000 });
    expect(byNumber.get("2")).toMatchObject({ categoryName: "保険給付費", amountYen: 71_143_291_000 });

    const total = categories.reduce((sum, c) => sum + c.amountYen, 0);
    expect(total).toBe(106_314_000_000);
  });
});

describe("parseRevenueBudgetTable", () => {
  it("当初予算: 歳入25款すべてを、歳出合計と一致する金額で抽出する(歳入歳出は均衡する)", () => {
    const categories = parseRevenueBudgetTable(initialBudgetItems);
    expect(categories).toHaveLength(25);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("1")).toMatchObject({ categoryName: "市税", amountYen: 316_158_003_000 });
    expect(byNumber.get("25")).toMatchObject({ categoryName: "市債", amountYen: 53_628_300_000 });

    const total = categories.reduce((sum, c) => sum + c.amountYen, 0);
    expect(total).toBe(716_000_000_000);
  });

  it("当初予算(国保): 歳入7款すべてを抽出する", () => {
    const categories = parseRevenueBudgetTable(kokuhoInitialBudgetItems);
    expect(categories).toHaveLength(7);

    const total = categories.reduce((sum, c) => sum + c.amountYen, 0);
    expect(total).toBe(106_314_000_000);
  });

  it("補正予算: 歳出側とは独立に、変更のあった款のみを抽出する(款の変更内容は歳出・歳入で一致するとは限らない)", () => {
    const categories = parseRevenueBudgetTable(amendmentBudgetItems);
    expect(categories).toHaveLength(4);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("18")).toMatchObject({ categoryName: "国庫支出金", amountYen: 149_169_780_000 });
    expect(byNumber.get("19")).toMatchObject({ categoryName: "県支出金", amountYen: 41_866_039_000 });
    expect(byNumber.get("22")).toMatchObject({ categoryName: "繰入金", amountYen: 28_974_288_000 });
    expect(byNumber.get("25")).toMatchObject({ categoryName: "市債", amountYen: 54_084_700_000 });
  });

  it("款が3つしかない補正予算でも、金額列の境界をヘッダー行の位置から正しく求める", () => {
    const categories = parseRevenueBudgetTable(amendment2BudgetItems);
    expect(categories).toHaveLength(3);

    const byNumber = new Map(categories.map((c) => [c.categoryNumber, c]));
    expect(byNumber.get("18")).toMatchObject({ categoryName: "国庫支出金", amountYen: 149_483_779_000 });
    expect(byNumber.get("19")).toMatchObject({ categoryName: "県支出金", amountYen: 41_866_475_000 });
    expect(byNumber.get("22")).toMatchObject({ categoryName: "繰入金", amountYen: 28_974_548_000 });
  });

  it("見出しが見つからない場合は空配列を返す(捏造しない)", () => {
    const items: PositionedTextItem[] = [{ str: "無関係", x: 0, y: 0, page: 1 }];
    expect(parseRevenueBudgetTable(items)).toEqual([]);
  });

  it("歳入の解析結果に歳出のカテゴリ名が混入しない(見出し以降を無制限にスキャンする実装の回帰テスト。docs/adr/0028)", () => {
    const revenueCategories = parseRevenueBudgetTable(initialBudgetItems);
    const expenditureCategories = parseExpenditureBudgetTable(initialBudgetItems);
    expect(revenueCategories).toHaveLength(25);
    expect(expenditureCategories).toHaveLength(13);

    const expenditureNames = new Set(expenditureCategories.map((c) => c.categoryName));
    for (const category of revenueCategories) {
      expect(expenditureNames.has(category.categoryName)).toBe(false);
    }

    const revenueNames = new Set(revenueCategories.map((c) => c.categoryName));
    for (const category of expenditureCategories) {
      expect(revenueNames.has(category.categoryName)).toBe(false);
    }
  });
});
