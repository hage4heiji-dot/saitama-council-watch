import Link from "next/link";
import { fetchLegislators } from "@/lib/apiClient";
import { FactionBar } from "@/components/FactionBar";

export const metadata = { title: "議員一覧 | さいたま市議会ウォッチ" };

interface LegislatorsPageProps {
  searchParams: Promise<{ includeInactive?: string }>;
}

export default async function LegislatorsPage({ searchParams }: LegislatorsPageProps) {
  const { includeInactive } = await searchParams;
  const showInactive = includeInactive === "true";
  const { items } = await fetchLegislators(showInactive);
  const activeCount = items.filter((legislator) => legislator.isActive).length;

  const factionCounts = new Map<string, number>();
  for (const legislator of items.filter((l) => l.isActive)) {
    const name = legislator.currentFaction?.name ?? "無所属・不明";
    factionCounts.set(name, (factionCounts.get(name) ?? 0) + 1);
  }
  const factions = [...factionCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">議員一覧</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/legislators/history" className="text-ink-secondary hover:underline">
            任期履歴を見る
          </Link>
          <Link
            href={showInactive ? "/legislators" : "/legislators?includeInactive=true"}
            className="text-ink-secondary hover:underline"
          >
            {showInactive ? "現職のみ表示" : "元議員も表示する"}
          </Link>
        </div>
      </div>
      <p className="mb-6 text-sm text-ink-muted">
        現職{activeCount}名{showInactive ? `(元議員含め全${items.length}名を表示中)` : ""}
        (出典: さいたま市議会公式サイト)
      </p>

      <section className="mb-8">
        <FactionBar factions={factions} />
      </section>

      <ul className="divide-y divide-hairline">
        {items.map((legislator) => (
          <li key={legislator.id} className="flex items-center justify-between py-3">
            <Link href={`/legislators/${legislator.id}`} className="group">
              <div className="font-medium text-ink-primary group-hover:underline">
                {legislator.name}
                {!legislator.isActive && <span className="ml-2 text-xs text-ink-muted">(元議員)</span>}
              </div>
              <div className="text-sm text-ink-muted">{legislator.nameKana}</div>
            </Link>
            {legislator.currentFaction ? (
              <span className="rounded-full bg-surface-1 px-3 py-1 text-sm text-ink-secondary border border-hairline">
                {legislator.currentFaction.name}
              </span>
            ) : (
              <span className="text-sm text-ink-muted">会派情報なし</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
