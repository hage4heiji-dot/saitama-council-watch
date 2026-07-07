import type { VoteWithLegislator } from "@saitama-council-watch/shared-types";
import { VOTE_TYPE_LABELS } from "@/lib/voteType";

interface VoteBreakdownProps {
  votes: VoteWithLegislator[];
}

interface FactionSummary {
  factionName: string;
  counts: Partial<Record<VoteWithLegislator["voteType"], number>>;
}

function summarizeByFaction(votes: VoteWithLegislator[]): FactionSummary[] {
  const byFaction = new Map<string, FactionSummary>();
  for (const vote of votes) {
    const factionName = vote.factionName ?? "無所属";
    const summary = byFaction.get(factionName) ?? { factionName, counts: {} };
    summary.counts[vote.voteType] = (summary.counts[vote.voteType] ?? 0) + 1;
    byFaction.set(factionName, summary);
  }
  return [...byFaction.values()].sort((a, b) => a.factionName.localeCompare(b.factionName, "ja"));
}

/**
 * 議案ごとの表決態度(docs/adr/0017)。会派単位の集計(色ではなく数値と名称で識別)と、
 * 議員個人単位の一覧(<details>で折りたたみ、追加のJSなしで実装)を併記する。
 */
export function VoteBreakdown({ votes }: VoteBreakdownProps) {
  if (votes.length === 0) {
    return null;
  }

  const factionSummaries = summarizeByFaction(votes);
  const sortedVotes = [...votes].sort((a, b) => {
    const factionCompare = (a.factionName ?? "無所属").localeCompare(b.factionName ?? "無所属", "ja");
    return factionCompare !== 0 ? factionCompare : a.legislatorName.localeCompare(b.legislatorName, "ja");
  });

  return (
    <section className="mb-6">
      <h2 className="mb-3 font-semibold">議員の表決態度</h2>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-surface-1 text-left">
              <th className="px-3 py-2 font-medium">会派</th>
              <th className="px-3 py-2 font-medium">賛成</th>
              <th className="px-3 py-2 font-medium">反対</th>
              <th className="px-3 py-2 font-medium">欠席</th>
              <th className="px-3 py-2 font-medium">棄権</th>
            </tr>
          </thead>
          <tbody>
            {factionSummaries.map((summary) => (
              <tr key={summary.factionName} className="border-b border-hairline last:border-b-0">
                <td className="px-3 py-2 text-ink-primary">{summary.factionName}</td>
                <td className="px-3 py-2 text-ink-secondary">{summary.counts.for ?? 0}</td>
                <td className="px-3 py-2 text-ink-secondary">{summary.counts.against ?? 0}</td>
                <td className="px-3 py-2 text-ink-secondary">{summary.counts.absent ?? 0}</td>
                <td className="px-3 py-2 text-ink-secondary">{summary.counts.abstain ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="mt-3 rounded-lg border border-hairline bg-surface-1 p-3">
        <summary className="cursor-pointer text-sm font-medium text-ink-primary">
          議員個人ごとの表決態度を見る({votes.length}名)
        </summary>
        <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
          {sortedVotes.map((vote) => (
            <li key={vote.legislatorId} className="flex items-center justify-between gap-2">
              <span className="text-ink-primary">
                {vote.legislatorName}
                <span className="ml-1 text-ink-muted">({vote.factionName ?? "無所属"})</span>
              </span>
              <span className="text-ink-secondary">{VOTE_TYPE_LABELS[vote.voteType]}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
