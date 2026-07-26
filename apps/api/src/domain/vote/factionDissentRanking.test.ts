import { describe, expect, it } from "vitest";
import type { VoteWithBillInfo } from "./VoteRepository.js";
import { buildFactionDissentRanking } from "./factionDissentRanking.js";

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

describe("buildFactionDissentRanking", () => {
  it("会派ごとにfor/against票数と反対率を集計し、反対率の降順で返す", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ legislatorId: "l1", factionName: "自民党市議団", voteType: "for" }),
      fakeVote({ legislatorId: "l2", factionName: "自民党市議団", voteType: "for" }),
      fakeVote({ legislatorId: "l3", factionName: "日本共産党", voteType: "against" }),
      fakeVote({ legislatorId: "l4", factionName: "日本共産党", voteType: "against" }),
      fakeVote({ legislatorId: "l4", billId: "bill-2", factionName: "日本共産党", voteType: "for" }),
    ];

    const ranking = buildFactionDissentRanking(votes);

    expect(ranking).toEqual([
      { factionName: "日本共産党", forCount: 1, againstCount: 2, dissentRate: 2 / 3 },
      { factionName: "自民党市議団", forCount: 2, againstCount: 0, dissentRate: 0 },
    ]);
  });

  it("会派不明(null)の議員は「無所属」にまとめる", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ legislatorId: "l1", factionName: null, voteType: "against" }),
      fakeVote({ legislatorId: "l2", factionName: null, voteType: "for" }),
    ];

    const ranking = buildFactionDissentRanking(votes);

    expect(ranking).toEqual([{ factionName: "無所属", forCount: 1, againstCount: 1, dissentRate: 0.5 }]);
  });

  it("abstain/absentは母数から除外する(賛否の意思表示ではないため)", () => {
    const votes: VoteWithBillInfo[] = [
      fakeVote({ legislatorId: "l1", voteType: "for" }),
      fakeVote({ legislatorId: "l1", billId: "bill-2", voteType: "abstain" }),
      fakeVote({ legislatorId: "l1", billId: "bill-3", voteType: "absent" }),
    ];

    const ranking = buildFactionDissentRanking(votes);

    expect(ranking).toEqual([{ factionName: "自民党市議団", forCount: 1, againstCount: 0, dissentRate: 0 }]);
  });

  it("投票記録が1件もない場合は空配列を返す", () => {
    expect(buildFactionDissentRanking([])).toEqual([]);
  });
});
