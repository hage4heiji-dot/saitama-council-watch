import Link from "next/link";
import type { BillStatus } from "@saitama-council-watch/shared-types";
import { fetchBills } from "@/lib/apiClient";
import { BILL_STATUS_LABELS, BILL_STATUS_ORDER } from "@/lib/billStatus";
import { StatusBadge } from "@/components/StatusBadge";

export const metadata = { title: "議案一覧 | さいたま市議会ウォッチ" };

interface BillsPageProps {
  searchParams: Promise<{ status?: string }>;
}

function isBillStatus(value: string): value is BillStatus {
  return (BILL_STATUS_ORDER as string[]).includes(value);
}

export default async function BillsPage({ searchParams }: BillsPageProps) {
  const { status: rawStatus } = await searchParams;
  const status = rawStatus && isBillStatus(rawStatus) ? rawStatus : undefined;

  // limitはAPIの上限(100)に合わせている。100件を超えたらページングUIが必要(現状のデータ規模ではYAGNI)。
  const { items: bills } = await fetchBills({ status, limit: 100 });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">
        議案一覧{status ? `(${BILL_STATUS_LABELS[status]})` : ""}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">{bills.length}件</p>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/bills"
          className={`rounded-full border border-hairline px-3 py-1 ${status ? "bg-surface-1 hover:bg-surface-page" : "bg-ink-primary text-surface-page"}`}
        >
          すべて
        </Link>
        {BILL_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/bills?status=${s}`}
            className={`rounded-full border border-hairline px-3 py-1 ${status === s ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {BILL_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

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
          </li>
        ))}
        {bills.length === 0 && <li className="py-3 text-ink-muted">該当する議案が見つかりませんでした。</li>}
      </ul>
    </main>
  );
}
