import Link from "next/link";
import type { BillStatus } from "@saitama-council-watch/shared-types";
import { fetchLegislatorTagMatrix, fetchMeetings } from "@/lib/apiClient";
import { BILL_STATUS_LABELS, BILL_STATUS_ORDER } from "@/lib/billStatus";

export const metadata = { title: "議員×タグ クロス集計 | さいたま市議会ウォッチ" };

interface AnalysisPageProps {
  searchParams: Promise<{ status?: string; meetingId?: string }>;
}

function isBillStatus(value: string): value is BillStatus {
  return (BILL_STATUS_ORDER as string[]).includes(value);
}

function hrefFor(options: { status?: string | undefined; meetingId?: string | undefined }): string {
  const params = new URLSearchParams();
  if (options.status) {
    params.set("status", options.status);
  }
  if (options.meetingId) {
    params.set("meetingId", options.meetingId);
  }
  const qs = params.toString();
  return qs ? `/analysis?${qs}` : "/analysis";
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const { status: rawStatus, meetingId } = await searchParams;
  const status = rawStatus && isBillStatus(rawStatus) ? rawStatus : undefined;

  const [matrix, { items: meetings }] = await Promise.all([
    fetchLegislatorTagMatrix(status, meetingId),
    fetchMeetings(50),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">議員×タグ クロス集計</h1>
      <p className="mb-6 text-sm text-ink-muted">
        議員がタグの付いた議案にどう投票したか(賛成/反対の件数)を集計します。承認済みのAIタグと投票記録の両方がある議案のみが対象です。
      </p>

      {meetings.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={hrefFor({ status, meetingId: undefined })}
            className={`rounded-full border border-hairline px-3 py-1 ${!meetingId ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            会期: すべて
          </Link>
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={hrefFor({ status, meetingId: meeting.id })}
              className={`rounded-full border border-hairline px-3 py-1 ${meetingId === meeting.id ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
            >
              {meeting.sessionName}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href={hrefFor({ status: undefined, meetingId })}
          className={`rounded-full border border-hairline px-3 py-1 ${!status ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          すべて
        </Link>
        {BILL_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={hrefFor({ status: s, meetingId })}
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
