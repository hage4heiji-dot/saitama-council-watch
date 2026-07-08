import { describe, expect, it } from "vitest";
import { classifyOrdinanceBillKind } from "./ordinanceBillClassification.js";

/**
 * 実データ(令和7〜8年度の条例関連議案44件)から採取した回帰テスト(docs/adr/0025)。
 */
describe("classifyOrdinanceBillKind", () => {
  it.each([
    "さいたま市いじめ問題救済委員会条例の制定について",
    "さいたま市ふるさと応援基金条例の制定について",
    "さいたま市立学校屋内プール使用料条例の制定について",
  ])("「%s」は制定(enactment)と判定する", (title) => {
    expect(classifyOrdinanceBillKind(title)).toBe("enactment");
  });

  it.each([
    "さいたま市国民健康保険税条例の一部を改正する条例の制定について",
    "さいたま市教職員定数条例の一部改正について",
    "さいたま市下水道事業の設置等に関する条例及びさいたま市水道事業の設置等に関する条例の一部を改正する条例の制定について",
    "さいたま市国民健康保険税条例の一部を改正する条例の一部を改正する条例の制定について",
  ])("「%s」は改正(amendment)と判定する", (title) => {
    expect(classifyOrdinanceBillKind(title)).toBe("amendment");
  });

  it.each([
    "さいたま市さいたま新都心バスターミナル条例を廃止する条例の制定について",
    "さいたま市さいたま北部医療センター跡地利活用事業者選定委員会条例を廃止する条例の制定について",
  ])("「%s」は廃止(abolition)と判定する", (title) => {
    expect(classifyOrdinanceBillKind(title)).toBe("abolition");
  });

  it("専決処分に包まれた改正議案の中身を見て判定する", () => {
    const title =
      "専決処分の報告及び承認を求めることについて（さいたま市市税条例等の一部を改正する条例の制定について）";
    expect(classifyOrdinanceBillKind(title)).toBe("amendment");
  });

  it.each(["令和8年度さいたま市一般会計予算", "議案第1号のようなただの議案", ""])(
    "条例に関する議案でない「%s」はnullを返す",
    (title) => {
      expect(classifyOrdinanceBillKind(title)).toBeNull();
    },
  );
});
