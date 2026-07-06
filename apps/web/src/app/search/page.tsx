import { searchBills } from "@/lib/apiClient";
import { HighlightedSnippet } from "@/components/HighlightedSnippet";

export const metadata = { title: "議案検索 | さいたま市議会ウォッチ" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const response = query.length > 0 ? await searchBills(query) : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-xl font-bold">議案を検索</h1>
      <form action="/search" method="get" className="mb-8 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="例: 補正予算、条例の制定について"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
          検索
        </button>
      </form>

      {response && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            「{response.query}」の検索結果: {response.results.length}件
          </p>
          <ul className="divide-y divide-gray-200">
            {response.results.map((result) => (
              <li key={result.bill.id} className="py-3">
                <div className="font-medium">
                  {result.bill.billNumber} {result.bill.title}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <HighlightedSnippet snippet={result.snippet} />
                </div>
                <a
                  href={result.bill.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  原本PDF
                </a>
              </li>
            ))}
            {response.results.length === 0 && (
              <li className="py-3 text-gray-500">該当する議案が見つかりませんでした。</li>
            )}
          </ul>
        </>
      )}
    </main>
  );
}
