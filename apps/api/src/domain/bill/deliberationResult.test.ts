import { describe, expect, it } from "vitest";
import { mapDeliberationResultToStatus, parseDeliberationResultText } from "./deliberationResult.js";

describe("parseDeliberationResultText (committee_report)", () => {
  it("委員会ごとの項番号ブロック・件名ブロック・結果ブロックを正しく対応付ける", () => {
    // 実データ(令和8年6月定例会 委員会審査結果報告一覧その2)の抜粋を模したフィクスチャ
    const text = `
委員会審査結果報告一覧（その２）

令和８年６月定例会
委員
会名
議案
請願
番号 件               名 審査結果
総合
政策
議案第１１２号

議案第１１３号

議案第１１４号

請願第  ７号
さいたま市監査委員条例の一部を改正する条例の制定
について
さいたま市新庁舎の建設工事に伴う交渉民間事業者等
審査委員会条例の制定について
さいたま市市税条例の一部を改正する条例の制定につ
いて
さいたま市食肉中央卸売市場・と畜場の維持・存続に向
けた努力を求める請願
原案可決

原案可決

原案可決

不　採　択
`;

    const items = parseDeliberationResultText(text, "committee_report");

    expect(items).toEqual([
      { kind: "議案", billNumber: "第112号", resultText: "原案可決" },
      { kind: "議案", billNumber: "第113号", resultText: "原案可決" },
      { kind: "議案", billNumber: "第114号", resultText: "原案可決" },
      { kind: "請願", billNumber: "第7号", resultText: "不採択" },
    ]);
  });

  it("件名中の「（第１号）」のような回次表記を議案番号と誤認しない(実データで発見した回帰)", () => {
    // 「令和８年度さいたま市一般会計補正予算（第１号）」のような件名が
    // 議案番号(第108号〜第111号)の並びとブロックを崩さないことを確認する。
    const text = `
予算
議案第１０８号
議案第１０９号

議案第１１０号

議案第１１１号

令和８年度さいたま市一般会計補正予算（第１号）
令和８年度さいたま市国民健康保険事業特別会計補正
予算（第１号）
令和８年度さいたま市水道事業会計補正予算（第１
号）
令和８年度さいたま市下水道事業会計補正予算（第１
号）
原案可決
原案可決

原案可決

原案可決
`;

    const items = parseDeliberationResultText(text, "committee_report");

    expect(items).toEqual([
      { kind: "議案", billNumber: "第108号", resultText: "原案可決" },
      { kind: "議案", billNumber: "第109号", resultText: "原案可決" },
      { kind: "議案", billNumber: "第110号", resultText: "原案可決" },
      { kind: "議案", billNumber: "第111号", resultText: "原案可決" },
    ]);
  });

  it("委員会名・議案番号・件名・結果が1行にまとまった単一議案(専決処分等)を解決する", () => {
    const text = `
予算 議案第１３８号 令和８年度さいたま市一般会計補正予算（第２号） 原案可決
`;
    const items = parseDeliberationResultText(text, "committee_report");

    expect(items).toEqual([{ kind: "議案", billNumber: "第138号", resultText: "原案可決" }]);
  });

  it("項番号の件数と結果の件数が一致しない区間は捏造を避けて解決しない", () => {
    const text = `
市民
生活
議案第２００号
議案第２０１号
件名A
件名B
原案可決
`;
    const items = parseDeliberationResultText(text, "committee_report");
    expect(items).toEqual([]);
  });
});

describe("parseDeliberationResultText (session_summary)", () => {
  it("種別接頭辞なしの単独行番号(専決処分の承認等)を解決する", () => {
    const text = `
議案番号提出日件　　　　　名議決結果議決日
第106号
令和8年
6月3日
専決処分の報告及び承認を求めること
について（さいたま市市税条例の一部を改正する条例の制定について）
承認
令和8年
6月4日
第107号
令和8年
6月3日
専決処分の報告及び承認を求めること
について（さいたま市国民健康保険税
条例の一部を改正する条例の一部を改
正する条例の制定について）
承認
令和8年
6月4日
令和8年6月定例会　議案審議結果一覧
`;
    const items = parseDeliberationResultText(text, "session_summary");

    expect(items).toEqual([
      { kind: "議案", billNumber: "第106号", resultText: "承認" },
      { kind: "議案", billNumber: "第107号", resultText: "承認" },
    ]);
  });
});

describe("mapDeliberationResultToStatus", () => {
  it.each([
    ["原案可決", "passed"],
    ["可決", "passed"],
    ["承認", "passed"],
    ["原案否決", "rejected"],
    ["否決", "rejected"],
    ["継続審査", "carried_over"],
    ["継続審議", "carried_over"],
  ] as const)("%s -> %s", (resultText, expected) => {
    expect(mapDeliberationResultToStatus(resultText)).toBe(expected);
  });

  it("現行BillStatusで表現できない結果(取下げ等)はnullを返す(断定しない)", () => {
    expect(mapDeliberationResultToStatus("取下げ")).toBeNull();
  });
});
