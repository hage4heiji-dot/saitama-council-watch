import Link from "next/link";
import { fetchTagCounts, searchBills } from "@/lib/apiClient";
import { HighlightedSnippet } from "@/components/HighlightedSnippet";
import { StatusBadge } from "@/components/StatusBadge";
import { TagList } from "@/components/TagList";

export const metadata = { title: "議案検索 | さいたま市議会ウォッチ" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string; tag?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, tag } = await searchParams;
  const query = q?.trim() ?? "";
  const [response, { items: allTagCounts }] = await Promise.all([
    query.length > 0 ? searchBills(query, 20, tag) : Promise.resolve(null),
    fetchTagCounts(),
  ]);

  function hrefFor(nextQuery: string, nextTag?: string): string {
    const params = new URLSearchParams();
    if (nextQuery) {
      params.set("q", nextQuery);
    }
    if (nextTag) {
      params.set("tag", nextTag);
    }
    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-xl font-bold">議案を検索</h1>
      <form action="/search" method="get" className="mb-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="例: 補正予算、条例の制定について"
          className="flex-1 rounded border border-hairline bg-surface-1 px-3 py-2 text-ink-primary"
        />
        {tag && <input type="hidden" name="tag" value={tag} />}
        <button type="submit" className="rounded bg-series-1 px-4 py-2 text-white">
          検索
        </button>
      </form>

      {allTagCounts.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 text-sm">
          <Link
            href={hrefFor(query, undefined)}
            className={`rounded-full border border-hairline px-3 py-1 ${!tag ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            タグ: すべて
          </Link>
          {allTagCounts.map(({ tag: t, count }) => (
            <Link
              key={t}
              href={hrefFor(query, t)}
              className={`rounded-full border border-hairline px-3 py-1 ${tag === t ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
            >
              {t}({count})
            </Link>
          ))}
        </div>
      )}

      {response && (
        <>
          <p className="mb-4 text-sm text-ink-muted">
            「{response.query}」の検索結果{tag ? `(タグ: ${tag})` : ""}: {response.results.length}件
          </p>
          <ul className="divide-y divide-hairline">
            {response.results.map((result) => (
              <li key={result.bill.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/bills/${result.bill.id}`} className="font-medium hover:underline">
                    {result.bill.billNumber} {result.bill.title}
                  </Link>
                  <StatusBadge status={result.bill.status} />
                </div>
                <div className="mt-1 text-sm text-ink-secondary">
                  <HighlightedSnippet snippet={result.snippet} />
                </div>
                <a
                  href={result.bill.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-series-1 hover:underline"
                >
                  原本PDF
                </a>
                <TagList tags={result.bill.tags} hrefForTag={(t) => hrefFor(query, t)} />
              </li>
            ))}
            {response.results.length === 0 && (
              <li className="py-3 text-ink-muted">該当する議案が見つかりませんでした。</li>
            )}
          </ul>
        </>
      )}
    </main>
  );
}
