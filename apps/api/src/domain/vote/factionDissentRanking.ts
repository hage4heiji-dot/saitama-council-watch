import type { VoteWithBillInfo } from "./VoteRepository.js";

export interface FactionDissentRow {
  factionName: string;
  forCount: number;
  againstCount: number;
  /** against / (for + against)。0〜1 */
  dissentRate: number;
}

/**
 * 会派別の反対率ランキング。各会派に所属する議員が投じたfor/against票のうち、
 * againstの割合を算出する(abstain/absentは賛否の意思表示ではないため母数から除外する)。
 * 無所属・会派不明の議員はまとめて「無所属」行にする(buildFactionTagMatrixと同じ方針)。
 * 反対率の降順(同率の場合は会派名の五十音順)で返す。
 */
export function buildFactionDissentRanking(votes: VoteWithBillInfo[]): FactionDissentRow[] {
  const countsByFaction = new Map<string, { for: number; against: number }>();

  for (const vote of votes) {
    if (vote.voteType !== "for" && vote.voteType !== "against") {
      continue;
    }
    const factionName = vote.factionName ?? "無所属";
    const counts = countsByFaction.get(factionName) ?? { for: 0, against: 0 };
    if (vote.voteType === "for") {
      counts.for += 1;
    } else {
      counts.against += 1;
    }
    countsByFaction.set(factionName, counts);
  }

  return [...countsByFaction.entries()]
    .map(([factionName, counts]) => ({
      factionName,
      forCount: counts.for,
      againstCount: counts.against,
      dissentRate: counts.against / (counts.for + counts.against),
    }))
    .sort((a, b) => b.dissentRate - a.dissentRate || a.factionName.localeCompare(b.factionName, "ja"));
}
