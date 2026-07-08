import type { VoteTally } from "@saitama-council-watch/shared-types";
import type { VoteWithBillInfo } from "./VoteRepository.js";

/**
 * 議案IDごとに賛否の内訳を集計する。可決/否決の結果だけでは会派間の賛否の
 * 分かれ方が見えないため、条例一覧(docs/adr/0025)で議案ごとに併記する。
 */
export function tallyVotesByBillId(votes: VoteWithBillInfo[]): Map<string, VoteTally> {
  const tallies = new Map<string, VoteTally>();
  for (const vote of votes) {
    const tally = tallies.get(vote.billId) ?? { for: 0, against: 0, absent: 0, abstain: 0 };
    tally[vote.voteType] += 1;
    tallies.set(vote.billId, tally);
  }
  return tallies;
}
