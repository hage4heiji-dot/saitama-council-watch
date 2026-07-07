import Link from "next/link";
import type { BillStatus } from "@saitama-council-watch/shared-types";
import { fetchFactionTagMatrix, fetchLegislatorTagMatrix, fetchMeetings } from "@/lib/apiClient";
import { BILL_STATUS_LABELS, BILL_STATUS_ORDER } from "@/lib/billStatus";

export const metadata = { title: "議員×タグ クロス集計 | さいたま市議会ウォッチ" };

const VIEWS = ["legislator", "faction"] as const;
type View = (typeof VIEWS)[number];

const VIEW_LABELS: Record<View, string> = {
  legislator: "議員別",
  faction: "会派別",
};

interface AnalysisPageProps {
  searchParams: Promise<{ status?: string; meetingId?: string; view?: string }>;
}

function isBillStatus(value: string): value is BillStatus {
  return (BILL_STATUS_ORDER as string[]).includes(value);
}

function isView(value: string): value is View {
  return (VIEWS as readonly string[]).includes(value);
}

function hrefFor(options: {
  status?: string | undefined;
  meetingId?: string | undefined;
  view?: string | undefined;
}): string {
  const params = new URLSearchParams();
  if (options.status) {
    params.set("status", options.status);
  }
  if (options.meetingId) {
    params.set("meetingId", options.meetingId);
  }
  if (options.view && options.view !== "legislator") {
    params.set("view", options.view);
  }
  const qs = params.toString();
  return qs ? `/analysis?${qs}` : "/analysis";
}

/** タグ列のヘッダーから、その条件(タグ・会期)に絞り込んだ議案一覧へドリルダウンする */
function searchHrefForTag(tag: string, meetingId?: string): string {
  const params = new URLSearchParams({ tag });
  if (meetingId) {
    params.set("meetingId", meetingId);
  }
  return `/search?${params.toString()}`;
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const { status: rawStatus, meetingId, view: rawView } = await searchParams;
  const status = rawStatus && isBillStatus(rawStatus) ? rawStatus : undefined;
  const view = rawView && isView(rawView) ? rawView : "legislator";

  const [legislatorMatrix, factionMatrix, { items: meetings }] = await Promise.all([
    view === "legislator" ? fetchLegislatorTagMatrix(status, meetingId) : null,
    view === "faction" ? fetchFactionTagMatrix(status, meetingId) : null,
    fetchMeetings(50),
  ]);

  const tags = (view === "legislator" ? legislatorMatrix?.tags : factionMatrix?.tags) ?? [];
  const hasRows = view === "legislator" ? (legislatorMatrix?.rows.length ?? 0) > 0 : (factionMatrix?.rows.length ?? 0) > 0;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">議員×タグ クロス集計</h1>
      <p className="mb-6 text-sm text-ink-muted">
        議員がタグの付いた議案にどう投票したか(賛成/反対の件数)を集計します。承認済みのAIタグと投票記録の両方がある議案のみが対象です。タグの見出しから、そのタグ(・会期)の議案一覧に移動できます。
      </p>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={hrefFor({ status, meetingId, view: v })}
            className={`rounded-full border border-hairline px-3 py-1 ${view === v ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {VIEW_LABELS[v]}
          </Link>
        ))}
      </div>

      {meetings.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2 text-sm">
          <Link
            href={hrefFor({ status, meetingId: undefined, view })}
            className={`rounded-full border border-hairline px-3 py-1 ${!meetingId ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            会期: すべて
          </Link>
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={hrefFor({ status, meetingId: meeting.id, view })}
              className={`rounded-full border border-hairline px-3 py-1 ${meetingId === meeting.id ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
            >
              {meeting.sessionName}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href={hrefFor({ status: undefined, meetingId, view })}
          className={`rounded-full border border-hairline px-3 py-1 ${!status ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          すべて
        </Link>
        {BILL_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={hrefFor({ status: s, meetingId, view })}
            className={`rounded-full border border-hairline px-3 py-1 ${status === s ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {BILL_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {!hasRows ? (
        <p className="text-ink-muted">
          現在、承認済みのAIタグと投票記録の両方が判明している議案がありません。管理画面でのタグ承認が進むと表示されます。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline bg-surface-1 text-left">
                <th className="sticky left-0 bg-surface-1 px-3 py-2 font-medium">
                  {view === "legislator" ? "議員" : "会派"}
                </th>
                {view === "legislator" && <th className="px-3 py-2 font-medium">会派</th>}
                {tags.map((tag) => (
                  <th key={tag} className="whitespace-nowrap px-3 py-2 font-medium">
                    <Link href={searchHrefForTag(tag, meetingId)} className="hover:underline">
                      {tag}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view === "legislator"
                ? legislatorMatrix?.rows.map((row) => (
                    <tr key={row.legislatorId} className="border-b border-hairline last:border-b-0">
                      <td className="sticky left-0 whitespace-nowrap bg-surface-page px-3 py-2 text-ink-primary">
                        <Link href={`/legislators/${row.legislatorId}`} className="hover:underline">
                          {row.legislatorName}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-ink-secondary">
                        {row.factionName ?? "無所属"}
                      </td>
                      {tags.map((tag) => {
                        const cell = row.cellsByTag[tag];
                        return (
                          <td key={tag} className="whitespace-nowrap px-3 py-2 text-ink-secondary">
                            {cell ? `賛${cell.for}反${cell.against}` : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                : factionMatrix?.rows.map((row) => (
                    <tr key={row.factionName} className="border-b border-hairline last:border-b-0">
                      <td className="sticky left-0 whitespace-nowrap bg-surface-page px-3 py-2 text-ink-primary">
                        {row.factionName}
                      </td>
                      {tags.map((tag) => {
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
