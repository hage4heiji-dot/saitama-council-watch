import { notFound } from "next/navigation";
import { fetchBillDetail, fetchBillVotes } from "@/lib/apiClient";
import { StatusBadge } from "@/components/StatusBadge";
import { VoteBreakdown } from "@/components/VoteBreakdown";

interface BillDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params;
  const bill = await fetchBillDetail(id);
  if (!bill) {
    notFound();
  }
  const { items: votes } = await fetchBillVotes(id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold">
          {bill.billNumber} {bill.title}
        </h1>
        <StatusBadge status={bill.status} />
      </div>
      <p className="mb-6 text-sm text-ink-muted">
        {bill.submittedDate ? `提出日: ${bill.submittedDate}` : "提出日: 未取得"} / {bill.category}
      </p>

      {bill.aiSummary && (
        <section className="mb-6 rounded-lg border border-hairline bg-surface-1 p-4">
          <div className="mb-2 inline-block rounded bg-series-1 px-2 py-0.5 text-xs font-semibold text-white">
            AI要約
          </div>
          <p className="whitespace-pre-wrap text-ink-primary">{bill.aiSummary}</p>
          {bill.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {bill.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-sequential-100 px-3 py-1 text-xs text-ink-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {bill.aiFaq.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 font-semibold">よくある質問(AI生成)</h2>
          <dl className="space-y-3">
            {bill.aiFaq.map((item) => (
              <div key={item.question} className="rounded-lg border border-hairline bg-surface-1 p-3">
                <dt className="font-medium text-ink-primary">Q. {item.question}</dt>
                <dd className="mt-1 text-ink-secondary">A. {item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {!bill.aiSummary && (
        <p className="mb-6 text-sm text-ink-muted">
          この議案のAI要約はまだ確認・公開されていません。
        </p>
      )}

      <VoteBreakdown votes={votes} />

      <a
        href={bill.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-lg border border-hairline bg-surface-1 px-4 py-2 text-sm hover:bg-surface-page"
      >
        原本PDFを見る(出典: さいたま市議会公式サイト)
      </a>
    </main>
  );
}
