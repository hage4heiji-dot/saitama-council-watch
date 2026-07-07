import Link from "next/link";
import type { BillStatus } from "@saitama-council-watch/shared-types";
import { fetchLegislatorTagMatrix } from "@/lib/apiClient";
import { BILL_STATUS_LABELS, BILL_STATUS_ORDER } from "@/lib/billStatus";

export const metadata = { title: "議員×タグ クロス集計 | さいたま市議会ウォッチ" };

interface AnalysisPageProps {
  searchParams: Promise<{ status?: string }>;
}

function isBillStatus(value: string): value is BillStatus {
  return (BILL_STATUS_ORDER as string[]).includes(value);
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const { status: rawStatus } = await searchParams;
  const status = rawStatus && isBillStatus(rawStatus) ? rawStatus : undefined;

  const matrix = await fetchLegislatorTagMatrix(status);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">議員×タグ クロス集計</h1>
      <p className="mb-6 text-sm text-ink-muted">
        議員がタグの付いた議案にどう投票したか(賛成/反対の件数)を集計します。承認済みのAIタグと投票記録の両方がある議案のみが対象です。
      </p>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/analysis"
          className={`rounded-full border border-hairline px-3 py-1 ${!status ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          すべて
        </Link>
        {BILL_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/analysis?status=${s}`}
            className={`rounded-full border border-hairline px-3 py-1 ${status === s ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {BILL_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {matrix.rows.length === 0 ? (
        <p className="text-ink-muted">
          現在、承認済みのAIタグと投票記録の両方が判明している議案がありません。管理画面でのタグ承認が進むと表示されます。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-1 text-left">
                <th className="sticky left-0 bg-surface-1 px-3 py-2 font-medium">議員</th>
                <th className="px-3 py-2 font-medium">会派</th>
                {matrix.tags.map((tag) => (
                  <th key={tag} className="whitespace-nowrap px-3 py-2 font-medium">
                    {tag}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.legislatorId} className="border-b border-hairline last:border-b-0">
                  <td className="sticky left-0 whitespace-nowrap bg-surface-page px-3 py-2 text-ink-primary">
                    {row.legislatorName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">{row.factionName ?? "無所属"}</td>
                  {matrix.tags.map((tag) => {
                    const cell = row.cellsByTag[tag];
                    return (
                      <td key={tag} className="whitespace-nowrap px-3 py-2 text-ink-secondary">
                        {cell ? `賛${cell.for}反${cell.against}` : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
