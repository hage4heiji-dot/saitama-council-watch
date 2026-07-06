import { fetchLegislators } from "@/lib/apiClient";

export const metadata = { title: "議員一覧 | さいたま市議会ウォッチ" };

export default async function LegislatorsPage() {
  const { items } = await fetchLegislators();

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">議員一覧</h1>
      <p className="mb-6 text-sm text-gray-500">現職{items.length}名(出典: さいたま市議会公式サイト)</p>
      <ul className="divide-y divide-gray-200">
        {items.map((legislator) => (
          <li key={legislator.id} className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium">{legislator.name}</div>
              <div className="text-sm text-gray-500">{legislator.nameKana}</div>
            </div>
            {legislator.currentFaction ? (
              <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-700">
                {legislator.currentFaction.name}
              </span>
            ) : (
              <span className="text-sm text-gray-400">会派情報なし</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
