import { describe, expect, it } from "vitest";
import { extractCommitteeBaseName, parseCommitteeCellLines } from "./parseCommitteeCell.js";

describe("parseCommitteeCellLines", () => {
  it("1件のみの場合はそのまま1件になる", () => {
    const entries = parseCommitteeCellLines(["10時　　　議会運営委員会"]);
    expect(entries).toEqual([{ time: "10時", committeeName: "議会運営委員会" }]);
  });

  it("時刻で始まる複数行はそれぞれ別の会議として扱う", () => {
    const entries = parseCommitteeCellLines(["9時30分　 議会改革推進特別委員会", "15時　　　子ども文教委員会"]);
    expect(entries).toEqual([
      { time: "9時30分", committeeName: "議会改革推進特別委員会" },
      { time: "15時", committeeName: "子ども文教委員会" },
    ]);
  });

  it("「散会後」も新しい会議の開始とみなす", () => {
    const entries = parseCommitteeCellLines(["10時　　　予算委員会", "散会後　　大宮駅グランドセントラルステーション化構想特別委員会"]);
    expect(entries).toEqual([
      { time: "10時", committeeName: "予算委員会" },
      { time: "散会後", committeeName: "大宮駅グランドセントラルステーション化構想特別委員会" },
    ]);
  });

  it("時刻で始まらない継続行は、委員会名が折り返されているだけとして直前の会議名に連結する", () => {
    const entries = parseCommitteeCellLines([
      "10時　　　決算特別委員会（概況説明、監査報告、総合振興計画基本計画実施状況報告、",
      "　　　　　区役所関係審査）【中継】",
    ]);
    expect(entries).toEqual([
      {
        time: "10時",
        committeeName: "決算特別委員会（概況説明、監査報告、総合振興計画基本計画実施状況報告、区役所関係審査）【中継】",
      },
    ]);
  });

  it("空行・空セルは無視する", () => {
    expect(parseCommitteeCellLines([""])).toEqual([]);
    expect(parseCommitteeCellLines([])).toEqual([]);
  });
});

describe("extractCommitteeBaseName", () => {
  it("末尾の括弧書きを除いた基本名を返す", () => {
    expect(extractCommitteeBaseName("予算委員会（企業会計関係審査）【中継】")).toBe("予算委員会");
    expect(extractCommitteeBaseName("決算特別委員会（討論・採決）【中継】")).toBe("決算特別委員会");
    expect(extractCommitteeBaseName("本会議【中継】")).toBe("本会議");
  });

  it("括弧書きが無い場合はそのまま返す", () => {
    expect(extractCommitteeBaseName("議会運営委員会")).toBe("議会運営委員会");
  });
});
