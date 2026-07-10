import Link from "next/link";
import type { OrdinanceBill, OrdinanceBillKind } from "@saitama-council-watch/shared-types";
import { fetchOrdinances } from "@/lib/apiClient";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "条例一覧 | さいたま市議会ウォッチ" };

interface OrdinancesPageProps {
  searchParams: Promise<{ kind?: string; dissent?: string; sort?: string }>;
}

const KIND_LABELS: Record<OrdinanceBillKind, string> = {
  enactment: "制定",
  amendment: "改正",
  abolition: "廃止",
};

const KIND_ORDER: OrdinanceBillKind[] = ["enactment", "amendment", "abolition"];

function isOrdinanceBillKind(value: string): value is OrdinanceBillKind {
  return (KIND_ORDER as string[]).includes(value);
}

function hrefFor(options: { kind: OrdinanceBillKind | undefined; dissent: boolean; sort: boolean }): string {
  const params = new URLSearchParams();
  if (options.kind) {
    params.set("kind", options.kind);
  }
  if (options.dissent) {
    params.set("dissent", "1");
  }
  if (options.sort) {
    params.set("sort", "asc");
  }
  const qs = params.toString();
  return qs ? `/ordinances?${qs}` : "/ordinances";
}

export default async function OrdinancesPage({ searchParams }: OrdinancesPageProps) {
  const { kind: rawKind, dissent: rawDissent, sort: rawSort } = await searchParams;
  const kind = rawKind && isOrdinanceBillKind(rawKind) ? rawKind : undefined;
  const dissentOnly = rawDissent === "1";
  const ascending = rawSort === "asc";

  const { items: allItems } = await fetchOrdinances();
  const filtered = allItems
    .filter((item) => !kind || item.kind === kind)
    .filter((item) => !dissentOnly || (item.voteTally?.against ?? 0) > 0);
  const items = ascending ? [...filtered].reverse() : filtered;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">条例一覧{kind ? `(${KIND_LABELS[kind]})` : ""}</h1>
      <p className="mb-4 text-sm text-ink-muted">
        条例の制定・改正・廃止に関する議案の一覧です({items.length}件)。取り込み開始(令和8年2月)より前に制定された条例の本来の制定日は分からないため、条例名ごとの現況一覧ではなく、議案そのものを表示しています。
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link
          href={hrefFor({ kind: undefined, dissent: dissentOnly, sort: ascending })}
          className={`rounded-full border border-hairline px-3 py-1 ${!kind ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          すべて
        </Link>
        {KIND_ORDER.map((k) => (
          <Link
            key={k}
            href={hrefFor({ kind: k, dissent: dissentOnly, sort: ascending })}
            className={`rounded-full border border-hairline px-3 py-1 ${kind === k ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {KIND_LABELS[k]}
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link
          href={hrefFor({ kind, dissent: !dissentOnly, sort: ascending })}
          className={`rounded-full border border-hairline px-3 py-1 ${dissentOnly ? "bg-status-critical text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          反対票のあった議案のみ
        </Link>
      </div>

      <div className="mb-6 flex gap-2 text-sm">
        <Link
          href={hrefFor({ kind, dissent: dissentOnly, sort: false })}
          className={`rounded-full border border-hairline px-3 py-1 ${!ascending ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          新しい順
        </Link>
        <Link
          href={hrefFor({ kind, dissent: dissentOnly, sort: true })}
          className={`rounded-full border border-hairline px-3 py-1 ${ascending ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          古い順
        </Link>
      </div>

      <ul className="divide-y divide-hairline">
        {items.map((item: OrdinanceBill) => (
          <li key={item.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/bills/${item.id}`} className="font-medium hover:underline">
                {item.title}
              </Link>
              <StatusBadge status={item.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
              <span className="rounded-full border border-hairline px-2.5 py-0.5 text-xs text-ink-secondary">
                {KIND_LABELS[item.kind]}
              </span>
              <span>{item.submittedDate ? `提出日: ${item.submittedDate}` : "提出日: 未取得"}</span>
              {item.voteTally && (
                <span className={item.voteTally.against > 0 ? "font-medium text-status-critical" : "text-ink-muted"}>
                  賛成{item.voteTally.for}・反対{item.voteTally.against}
                  {item.voteTally.absent + item.voteTally.abstain > 0
                    ? `・欠席等${item.voteTally.absent + item.voteTally.abstain}`
                    : ""}
                </span>
              )}
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-series-1 hover:underline">
                原本PDF
              </a>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-ink-muted">該当する議案が見つかりませんでした。</li>}
      </ul>
    </main>
  );
}
