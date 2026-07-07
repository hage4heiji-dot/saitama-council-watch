import type { VoteType } from "@saitama-council-watch/shared-types";

export const VOTE_TYPE_LABELS: Record<VoteType, string> = {
  for: "賛成",
  against: "反対",
  absent: "欠席",
  // 退席・除斥をまとめて棄権として扱う簡略化(docs/adr/0017)
  abstain: "棄権",
};
