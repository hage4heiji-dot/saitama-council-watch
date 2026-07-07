import { describe, expect, it } from "vitest";
import type { VoteWithBillInfo } from "./VoteRepository.js";
import { buildLegislatorTagMatrix } from "./legislatorTagMatrix.js";

function fakeVote(overrides: Partial<VoteWithBillInfo>): VoteWithBillInfo {
  return {
    legislatorId: "legislator-1",
    legislatorName: "山田太郎",
    factionName: "自民党市議団",
    billId: "bill-1",
    billSourceDocumentId: "doc-1",
    billStatus: "passed",
    voteType: "for",
    ...overrides,
  };
}

describe("buildLegislatorTagMatrix", () => {
  it("議員×タグごとに賛成・反対の件数を集計する", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ billSourceDocumentId: "doc-1", voteType: "for" }),
      fakeVote({ billSourceDocumentId: "doc-2", voteType: "against" }),
      fakeVote({
        legislatorId: "legislator-2",
        legislatorName: "鈴木花子",
        factionName: "公明党",
        billSourceDocumentId: "doc-1",
        voteType: "against",
      }),
    ];
    const tagsBySourceDocumentId = new Map([
      ["doc-1", ["予算"]],
      ["doc-2", ["福祉", "予算"]],
    ]);

    const matrix = buildLegislatorTagMatrix(votes, tagsBySourceDocumentId);

    expect(matrix.tags.sort()).toEqual(["予算", "福祉"].sort());
    const yamada = matrix.rows.find((row) => row.legislatorId === "legislator-1");
    expect(yamada?.cellsByTag).toEqual({
      予算: { for: 1, against: 1 },
      福祉: { for: 0, against: 1 },
    });
    const suzuki = matrix.rows.find((row) => row.legislatorId === "legislator-2");
    expect(suzuki?.cellsByTag).toEqual({ 予算: { for: 0, against: 1 } });
  });

  it("タグが1つも確定していない議案は集計対象から除外する(捏造しない)", () => {
    const votes: VoteWithBillInfo[] = [fakeVote({ billSourceDocumentId: "doc-untagged" })];
    const matrix = buildLegislatorTagMatrix(votes, new Map());
    expect(matrix.rows).toEqual([]);
    expect(matrix.tags).toEqual([]);
  });

  it("statusFilterを指定すると、その可決状態の議案のみを対象にする", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ billSourceDocumentId: "doc-1", billStatus: "passed", voteType: "for" }),
      fakeVote({ billSourceDocumentId: "doc-1", billStatus: "rejected", voteType: "against", billId: "bill-2" }),
    ];
    const tagsBySourceDocumentId = new Map([["doc-1", ["予算"]]]);

    const passedOnly = buildLegislatorTagMatrix(votes, tagsBySourceDocumentId, "passed");
    expect(passedOnly.rows[0]?.cellsByTag).toEqual({ 予算: { for: 1, against: 0 } });

    const rejectedOnly = buildLegislatorTagMatrix(votes, tagsBySourceDocumentId, "rejected");
    expect(rejectedOnly.rows[0]?.cellsByTag).toEqual({ 予算: { for: 0, against: 1 } });
  });

  it("投票記録が1件もない議員は結果に含めない", () => {
    const votes: VoteWithBillInfo[] = [fakeVote({ billSourceDocumentId: "doc-1" })];
    const matrix = buildLegislatorTagMatrix(votes, new Map([["doc-1", ["予算"]]]));
    expect(matrix.rows).toHaveLength(1);
  });
});
