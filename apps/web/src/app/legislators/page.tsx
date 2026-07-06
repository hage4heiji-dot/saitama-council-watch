import { fetchLegislators } from "@/lib/apiClient";
import { FactionBar } from "@/components/FactionBar";

export const metadata = { title: "議員一覧 | さいたま市議会ウォッチ" };

export default async function LegislatorsPage() {
  const { items } = await fetchLegislators();

  const factionCounts = new Map<string, number>();
  for (const legislator of items) {
    const name = legislator.currentFaction?.name ?? "無所属・不明";
    factionCounts.set(name, (factionCounts.get(name) ?? 0) + 1);
  }
  const factions = [...factionCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">議員一覧</h1>
      <p className="mb-6 text-sm text-ink-muted">現職{items.length}名(出典: さいたま市議会公式サイト)</p>

      <section className="mb-8">
        <FactionBar factions={factions} />
      </section>

      <ul className="divide-y divide-hairline">
        {items.map((legislator) => (
          <li key={legislator.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-ink-primary">{legislator.name}</div>
              <div className="text-sm text-ink-muted">{legislator.nameKana}</div>
            </div>
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
