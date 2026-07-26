import Link from "next/link";
import { fetchFactionDissentRanking } from "@/lib/apiClient";

export const metadata = { title: "会派別 反対率ランキング | さいたま市議会ウォッチ" };

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default async function FactionDissentPage() {
  const { rows } = await fetchFactionDissentRanking();
  const maxRate = Math.max(...rows.map((r) => r.dissentRate), 0.01);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">会派別 反対率ランキング</h1>
      <p className="mb-6 text-sm text-ink-muted">
        議案の採決で記録された賛否のうち、各会派の議員が反対した票の割合です(欠席・棄権は母数に含めません)。
        <Link href="/analysis" className="ml-1 text-ink-secondary hover:underline">
          議員×タグのクロス集計を見る
        </Link>
      </p>

      {rows.length === 0 ? (
        <p className="text-ink-muted">投票データがまだありません。</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.factionName}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-ink-primary">{row.factionName}</span>
                <span className="text-ink-secondary">
                  {formatPercent(row.dissentRate)}
                  <span className="ml-1 text-ink-muted">
                    (反対{row.againstCount}/賛成{row.forCount})
                  </span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-1">
                <div
                  className="h-2 rounded-full bg-sequential-450"
                  style={{ width: `${Math.max((row.dissentRate / maxRate) * 100, 1)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
