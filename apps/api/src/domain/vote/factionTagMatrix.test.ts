import { describe, expect, it } from "vitest";
import type { VoteWithBillInfo } from "./VoteRepository.js";
import { buildFactionTagMatrix } from "./factionTagMatrix.js";

function fakeVote(overrides: Partial<VoteWithBillInfo>): VoteWithBillInfo {
  return {
    legislatorId: "legislator-1",
    legislatorName: "山田太郎",
    factionName: "自民党市議団",
    billId: "bill-1",
    billSourceDocumentId: "doc-1",
    billStatus: "passed",
    billMeetingId: "meeting-1",
    voteType: "for",
    ...overrides,
  };
}

describe("buildFactionTagMatrix", () => {
  it("会派×タグごとに賛成・反対の件数を集計する(同一会派の複数議員は合算)", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ legislatorId: "legislator-1", billSourceDocumentId: "doc-1", voteType: "for" }),
      fakeVote({
        legislatorId: "legislator-2",
        legislatorName: "佐藤次郎",
        factionName: "自民党市議団",
        billSourceDocumentId: "doc-1",
        voteType: "for",
      }),
      fakeVote({
        legislatorId: "legislator-3",
        legislatorName: "鈴木花子",
        factionName: "公明党",
        billSourceDocumentId: "doc-1",
        voteType: "against",
      }),
    ];
    const tagsBySourceDocumentId = new Map([["doc-1", ["予算"]]]);

    const matrix = buildFactionTagMatrix(votes, tagsBySourceDocumentId);

    expect(matrix.tags).toEqual(["予算"]);
    const jimin = matrix.rows.find((row) => row.factionName === "自民党市議団");
    expect(jimin?.cellsByTag).toEqual({ 予算: { for: 2, against: 0 } });
    const komei = matrix.rows.find((row) => row.factionName === "公明党");
    expect(komei?.cellsByTag).toEqual({ 予算: { for: 0, against: 1 } });
  });

  it("会派名がnullの議員は「無所属」行にまとめる", () => {
    const votes: VoteWithBillInfo[] = [fakeVote({ factionName: null, billSourceDocumentId: "doc-1" })];
    const matrix = buildFactionTagMatrix(votes, new Map([["doc-1", ["予算"]]]));
    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]?.factionName).toBe("無所属");
  });

  it("タグが1つも確定していない議案は集計対象から除外する(捏造しない)", () => {
    const votes: VoteWithBillInfo[] = [fakeVote({ billSourceDocumentId: "doc-untagged" })];
    const matrix = buildFactionTagMatrix(votes, new Map());
    expect(matrix.rows).toEqual([]);
  });

  it("statusFilter・meetingIdFilterで絞り込める", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ billSourceDocumentId: "doc-1", billStatus: "passed", billMeetingId: "meeting-1", voteType: "for" }),
      fakeVote({
        billSourceDocumentId: "doc-1",
        billStatus: "rejected",
        billMeetingId: "meeting-2",
        voteType: "against",
        billId: "bill-2",
      }),
    ];
    const tagsBySourceDocumentId = new Map([["doc-1", ["予算"]]]);

    const byStatus = buildFactionTagMatrix(votes, tagsBySourceDocumentId, "passed");
    expect(byStatus.rows[0]?.cellsByTag).toEqual({ 予算: { for: 1, against: 0 } });

    const byMeeting = buildFactionTagMatrix(votes, tagsBySourceDocumentId, undefined, "meeting-2");
    expect(byMeeting.rows[0]?.cellsByTag).toEqual({ 予算: { for: 0, against: 1 } });
  });
});
