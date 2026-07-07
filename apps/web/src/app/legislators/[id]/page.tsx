import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchLegislatorDetail } from "@/lib/apiClient";
import { StatusBadge } from "@/components/StatusBadge";
import { TagList } from "@/components/TagList";
import { VOTE_TYPE_LABELS } from "@/lib/voteType";

interface LegislatorDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LegislatorDetailPage({ params }: LegislatorDetailPageProps) {
  const { id } = await params;
  const legislator = await fetchLegislatorDetail(id);
  if (!legislator) {
    notFound();
  }

  const { voteSummary } = legislator;
  const totalVotes = voteSummary.for + voteSummary.against + voteSummary.absent + voteSummary.abstain;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{legislator.name}</h1>
          <p className="text-sm text-ink-muted">{legislator.nameKana}</p>
        </div>
        {!legislator.isActive && (
          <span className="rounded-full border border-hairline bg-surface-1 px-2.5 py-0.5 text-xs font-medium text-ink-muted">
            元議員
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-ink-secondary">
        現在の会派: {legislator.currentFaction?.name ?? "無所属・不明"}
      </p>

      {legislator.factionHistory.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold">会派の異動履歴</h2>
          <ul className="space-y-1.5 text-sm">
            {legislator.factionHistory.map((entry) => (
              <li key={`${entry.faction.id}-${entry.validFrom}`} className="flex items-center gap-2">
                <span className="text-ink-primary">{entry.faction.name}</span>
                <span className="text-ink-muted">
                  ({entry.validFrom} 〜 {entry.validTo ?? "現在"})
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 font-semibold">投票の内訳(全{totalVotes}件)</h2>
        <div className="grid grid-cols-4 gap-2 text-center text-sm">
          <div className="rounded-lg border border-hairline bg-surface-1 p-3">
            <div className="text-lg font-bold text-ink-primary">{voteSummary.for}</div>
            <div className="text-ink-muted">賛成</div>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-1 p-3">
            <div className="text-lg font-bold text-ink-primary">{voteSummary.against}</div>
            <div className="text-ink-muted">反対</div>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-1 p-3">
            <div className="text-lg font-bold text-ink-primary">{voteSummary.absent}</div>
            <div className="text-ink-muted">欠席</div>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-1 p-3">
            <div className="text-lg font-bold text-ink-primary">{voteSummary.abstain}</div>
            <div className="text-ink-muted">棄権</div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">活動記録(議案への投票)</h2>
        {legislator.voteRecords.length === 0 ? (
          <p className="text-sm text-ink-muted">投票記録はまだありません。</p>
        ) : (
          <ul className="space-y-3">
            {legislator.voteRecords.map((record) => (
              <li key={record.billId} className="rounded-lg border border-hairline bg-surface-1 p-3">
                <div className="mb-1 flex items-start justify-between gap-3">
                  <Link
                    href={`/bills/${record.billId}`}
                    className="font-medium text-ink-primary hover:underline"
                  >
                    {record.billNumber} {record.billTitle}
                  </Link>
                  <StatusBadge status={record.billStatus} />
                </div>
                <p className="text-sm text-ink-secondary">
                  投票日: {record.votedAt} / 表決態度: {VOTE_TYPE_LABELS[record.voteType]}
                </p>
                <TagList tags={record.tags} hrefForTag={(tag) => `/bills?tag=${encodeURIComponent(tag)}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
