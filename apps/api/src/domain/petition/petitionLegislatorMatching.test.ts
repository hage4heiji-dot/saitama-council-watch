import { describe, expect, it } from "vitest";
import { matchIntroducingLegislators } from "./petitionLegislatorMatching.js";

describe("matchIntroducingLegislators", () => {
  const knownLegislators = [
    { id: "1", name: "吉田　一郎" },
    { id: "2", name: "久保　美樹" },
    { id: "3", name: "鳥羽　恵" },
    { id: "4", name: "竹腰　連" },
    { id: "5", name: "中山　淳一" },
    { id: "6", name: "池田　めぐみ" },
  ];

  it("単一の紹介議員を紐付ける", () => {
    const result = matchIntroducingLegislators("吉田 一郎", knownLegislators);
    expect(result).toEqual([{ rawName: "吉田　一郎", legislatorId: "1" }]);
  });

  it("一致する議員がいない場合はlegislatorIdをnullのままにする(捏造しない)", () => {
    const result = matchIntroducingLegislators("未知 太郎", knownLegislators);
    expect(result).toEqual([{ rawName: "未知太郎", legislatorId: null }]);
  });

  it("短い氏名(姓名間に2文字分の空白)でも、複数人の区切りと誤認せず正しく分割する(実データ由来の回帰テスト)", () => {
    // 「紹介議員」欄の原文(令和8年6月定例会 請願第7号): 改行区切りで2人、
    // 「鳥羽　恵」は短い氏名のため姓名間に2文字分の空白が入る
    const rawText = "鳥羽  恵 \n池田 めぐみ ";
    const result = matchIntroducingLegislators(rawText, knownLegislators);
    expect(result).toEqual(
      expect.arrayContaining([
        { rawName: "鳥羽　恵", legislatorId: "3" },
        { rawName: "池田　めぐみ", legislatorId: "6" },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it("3人が空白区切りで1行に並ぶケース(短い氏名を含む)を正しく分割する(実データ由来の回帰テスト)", () => {
    // 令和8年6月定例会 請願第9号: 「久保 美樹  竹腰  連  中山 淳一」
    const rawText = "久保 美樹  竹腰  連  中山 淳一";
    const result = matchIntroducingLegislators(rawText, knownLegislators);
    expect(result).toEqual(
      expect.arrayContaining([
        { rawName: "久保　美樹", legislatorId: "2" },
        { rawName: "竹腰　連", legislatorId: "4" },
        { rawName: "中山　淳一", legislatorId: "5" },
      ]),
    );
    expect(result).toHaveLength(3);
  });

  it("空文字列からは空配列を返す", () => {
    expect(matchIntroducingLegislators("", knownLegislators)).toEqual([]);
    expect(matchIntroducingLegislators("   ", knownLegislators)).toEqual([]);
  });
});
