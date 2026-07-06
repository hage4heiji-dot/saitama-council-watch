import { notFound } from "next/navigation";
import { fetchBillDetail } from "@/lib/apiClient";

interface BillDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BillDetailPage({ params }: BillDetailPageProps) {
  const { id } = await params;
  const bill = await fetchBillDetail(id);
  if (!bill) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">
        {bill.billNumber} {bill.title}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {bill.submittedDate ? `提出日: ${bill.submittedDate}` : "提出日: 未取得"} / {bill.category}
      </p>

      {bill.aiSummary && (
        <section className="mb-6 rounded border border-blue-200 bg-blue-50 p-4">
          <div className="mb-2 inline-block rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
            AI要約
          </div>
          <p className="whitespace-pre-wrap text-gray-800">{bill.aiSummary}</p>
          {bill.aiTags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {bill.aiTags.map((tag) => (
                <span key={tag} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-800">
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
              <div key={item.question} className="rounded border border-gray-200 p-3">
                <dt className="font-medium">Q. {item.question}</dt>
                <dd className="mt-1 text-gray-700">A. {item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {!bill.aiSummary && (
        <p className="mb-6 text-sm text-gray-500">
          この議案のAI要約はまだ確認・公開されていません。
        </p>
      )}

      <a
        href={bill.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
      >
        原本PDFを見る(出典: さいたま市議会公式サイト)
      </a>
    </main>
  );
}
