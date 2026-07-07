import Link from "next/link";
import type { BillStatus } from "@saitama-council-watch/shared-types";
import { fetchBills, fetchTagCounts } from "@/lib/apiClient";
import { BILL_STATUS_LABELS, BILL_STATUS_ORDER } from "@/lib/billStatus";
import { StatusBadge } from "@/components/StatusBadge";
import { TagList } from "@/components/TagList";

export const metadata = { title: "議案一覧 | さいたま市議会ウォッチ" };

interface BillsPageProps {
  searchParams: Promise<{ status?: string; tag?: string }>;
}

function isBillStatus(value: string): value is BillStatus {
  return (BILL_STATUS_ORDER as string[]).includes(value);
}

/** 現在のフィルタ状態を保ったまま、指定したパラメータだけ変更/解除したURLを作る */
function buildFilterHref(
  current: { status?: string | undefined; tag?: string | undefined },
  changes: { status?: string | undefined; tag?: string | undefined },
): string {
  const params = new URLSearchParams();
  const status = "status" in changes ? changes.status : current.status;
  const tag = "tag" in changes ? changes.tag : current.tag;
  if (status) {
    params.set("status", status);
  }
  if (tag) {
    params.set("tag", tag);
  }
  const qs = params.toString();
  return qs ? `/bills?${qs}` : "/bills";
}

export default async function BillsPage({ searchParams }: BillsPageProps) {
  const { status: rawStatus, tag } = await searchParams;
  const status = rawStatus && isBillStatus(rawStatus) ? rawStatus : undefined;

  // limitはAPIの上限(100)に合わせている。100件を超えたらページングUIが必要(現状のデータ規模ではYAGNI)。
  const [{ items: bills }, { items: allTagCounts }] = await Promise.all([
    fetchBills({ status, tag, limit: 100 }),
    fetchTagCounts(),
  ]);

  const current = { status, tag };

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">
        議案一覧
        {status ? `(${BILL_STATUS_LABELS[status]})` : ""}
        {tag ? `(タグ: ${tag})` : ""}
      </h1>
      <p className="mb-4 text-sm text-ink-muted">{bills.length}件</p>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        <Link
          href={buildFilterHref(current, { status: undefined })}
          className={`rounded-full border border-hairline px-3 py-1 ${!status ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          すべて
        </Link>
        {BILL_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={buildFilterHref(current, { status: s })}
            className={`rounded-full border border-hairline px-3 py-1 ${status === s ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {BILL_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {allTagCounts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link
            href={buildFilterHref(current, { tag: undefined })}
            className={`rounded-full border border-hairline px-3 py-1 ${!tag ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            タグ: すべて
          </Link>
          {allTagCounts.map(({ tag: t, count }) => (
            <Link
              key={t}
              href={buildFilterHref(current, { tag: t })}
              className={`rounded-full border border-hairline px-3 py-1 ${tag === t ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
            >
              {t}({count})
            </Link>
          ))}
        </div>
      )}

      <ul className="divide-y divide-hairline">
        {bills.map((bill) => (
          <li key={bill.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/bills/${bill.id}`} className="font-medium hover:underline">
                {bill.billNumber} {bill.title}
              </Link>
              <StatusBadge status={bill.status} />
            </div>
            <div className="mt-1 flex gap-3 text-sm text-ink-muted">
              <span>{bill.submittedDate ? `提出日: ${bill.submittedDate}` : "提出日: 未取得"}</span>
              <a
                href={bill.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-series-1 hover:underline"
              >
                原本PDF
              </a>
            </div>
            <TagList tags={bill.tags} hrefForTag={(t) => buildFilterHref(current, { tag: t })} />
          </li>
        ))}
        {bills.length === 0 && <li className="py-3 text-ink-muted">該当する議案が見つかりませんでした。</li>}
      </ul>
    </main>
  );
}
