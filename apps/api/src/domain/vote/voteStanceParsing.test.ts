import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { VoteType } from "@saitama-council-watch/shared-types";
import { describe, expect, it } from "vitest";
import { parseVoteStancePdf, type KnownLegislator, type PositionedTextItem } from "./voteStanceParsing.js";

const fixtureDir = fileURLToPath(new URL("./__fixtures__/", import.meta.url));

/**
 * 実データ(令和8年2月定例会 議案表決態度一覧PDF、1ページ目の名簿+議案第1号・第2号)
 * から抽出した座標付きテキスト。手計算で検証済みの結果(会派の記号+個別の欠席注記)を
 * 固定化する回帰テスト(docs/adr/0017)。
 */
const positionedItems: PositionedTextItem[] = JSON.parse(
  readFileSync(`${fixtureDir}voteStancePage1Sample.json`, "utf-8"),
);
const legislators: KnownLegislator[] = JSON.parse(readFileSync(`${fixtureDir}legislators.json`, "utf-8"));

describe("parseVoteStancePdf", () => {
  it("議長を除く全議員(57名)の投票を各議案について解決する", () => {
    const results = parseVoteStancePdf(positionedItems, legislators);
    expect(results).toHaveLength(2);
    for (const result of results) {
      expect(result.votes).toHaveLength(57);
    }
  });

  it("議案第1号: 会派単位の賛成に、個別の欠席注記(尾上貴明・関ひろみ・堀川友良)を反映する", () => {
    const results = parseVoteStancePdf(positionedItems, legislators);
    const bill1 = results.find((r) => r.billNumber === "第1号");
    expect(bill1?.decidedOn).toEqual({ month: 2, day: 4 });

    const byType = countByVoteType(bill1?.votes ?? []);
    expect(byType).toEqual({ for: 53, against: 1, absent: 3 });

    const absentNames = namesWithVoteType(bill1?.votes ?? [], legislators, "absent");
    expect(absentNames.sort()).toEqual(["堀川友良", "尾上貴明", "関ひろみ"].sort());
  });

  it("議案第2号: 公明党の欠席注記(小森谷優)を反映しつつ、複数会派の反対を正しく集計する", () => {
    const results = parseVoteStancePdf(positionedItems, legislators);
    const bill2 = results.find((r) => r.billNumber === "第2号");
    expect(bill2?.decidedOn).toEqual({ month: 3, day: 12 });

    const byType = countByVoteType(bill2?.votes ?? []);
    expect(byType).toEqual({ for: 46, against: 10, absent: 1 });

    const absentNames = namesWithVoteType(bill2?.votes ?? [], legislators, "absent");
    expect(absentNames).toEqual(["小森谷優"]);
  });
});

function countByVoteType(votes: { voteType: VoteType }[]): Partial<Record<VoteType, number>> {
  const counts: Partial<Record<VoteType, number>> = {};
  for (const vote of votes) {
    counts[vote.voteType] = (counts[vote.voteType] ?? 0) + 1;
  }
  return counts;
}

function namesWithVoteType(
  votes: { legislatorId: string; voteType: VoteType }[],
  legislatorList: KnownLegislator[],
  voteType: VoteType,
): (string | undefined)[] {
  const byId = new Map(legislatorList.map((l) => [l.id, l.name.replace(/[\s　]/g, "")]));
  return votes.filter((v) => v.voteType === voteType).map((v) => byId.get(v.legislatorId));
}
