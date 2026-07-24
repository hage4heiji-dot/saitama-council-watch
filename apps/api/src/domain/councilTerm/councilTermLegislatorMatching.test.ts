import { describe, expect, it } from "vitest";
import { matchCouncilTermLegislator } from "./councilTermLegislatorMatching.js";

describe("matchCouncilTermLegislator", () => {
  const legislators = [
    { id: "1", name: "石関 洋臣", nameKana: "イシゼキ ヒロオミ" },
    { id: "2", name: "神坂 達成", nameKana: "カミサカ タツアキ" },
    { id: "3", name: "堤 日出喜", nameKana: "ツツミ ヒデキ" },
    { id: "4", name: "松村 敏夫", nameKana: "マツムラ トシオ" },
    { id: "5", name: "秋山 朋彦", nameKana: "アキヤマ トモヒコ" },
    { id: "6", name: "都築 龍太", nameKana: "ツヅキ リョウタ" },
  ];

  it("氏名が漢字で完全一致する場合はそのまま一致する", () => {
    expect(matchCouncilTermLegislator("石関 洋臣", legislators)).toBe("1");
  });

  it("姓名の一方がひらがな表記でも、読みが一致すれば同一人物とみなす(緑区2023年当選者、実データ由来の回帰テスト)", () => {
    expect(matchCouncilTermLegislator("石関 ひろおみ", legislators)).toBe("1");
  });

  it("姓名の両方がひらがな表記でも、読みが一致すれば同一人物とみなす(実データ由来の回帰テスト)", () => {
    expect(matchCouncilTermLegislator("かみさか たつあき", legislators)).toBe("2");
    expect(matchCouncilTermLegislator("つづき 龍太", legislators)).toBe("6");
  });

  it("既知の議員と読みも氏名も一致しない場合はnullのままにする(捏造しない)", () => {
    expect(matchCouncilTermLegislator("未知 太郎", legislators)).toBeNull();
  });

  it("姓名のトークン数が一致しない場合はnullのままにする", () => {
    expect(matchCouncilTermLegislator("石関", legislators)).toBeNull();
  });

  it("読みが複数人と一致してしまう場合は確信が持てないためnullのままにする", () => {
    const ambiguous = [
      { id: "a", name: "山田 太郎", nameKana: "ヤマダ タロウ" },
      { id: "b", name: "山田 太朗", nameKana: "ヤマダ タロウ" },
    ];
    expect(matchCouncilTermLegislator("やまだ たろう", ambiguous)).toBeNull();
  });
});
