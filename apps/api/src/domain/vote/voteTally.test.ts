import { describe, expect, it } from "vitest";
import { tallyVotesByBillId } from "./voteTally.js";
import type { VoteWithBillInfo } from "./VoteRepository.js";

function vote(billId: string, voteType: VoteWithBillInfo["voteType"]): VoteWithBillInfo {
  return {
    legislatorId: "legislator",
    legislatorName: "議員",
    factionName: null,
    billId,
    billSourceDocumentId: "doc",
    billStatus: "passed",
    billMeetingId: "meeting",
    voteType,
  };
}

describe("tallyVotesByBillId", () => {
  it("議案ごとに賛否・欠席・退席の内訳を集計する", () => {
    const votes = [
      vote("bill-1", "for"),
      vote("bill-1", "for"),
      vote("bill-1", "against"),
      vote("bill-2", "for"),
      vote("bill-2", "absent"),
      vote("bill-2", "abstain"),
    ];
    const tallies = tallyVotesByBillId(votes);
    expect(tallies.get("bill-1")).toEqual({ for: 2, against: 1, absent: 0, abstain: 0 });
    expect(tallies.get("bill-2")).toEqual({ for: 1, against: 0, absent: 1, abstain: 1 });
  });

  it("投票記録のない議案IDはマップに含まれない", () => {
    const tallies = tallyVotesByBillId([vote("bill-1", "for")]);
    expect(tallies.has("bill-2")).toBe(false);
  });
});
