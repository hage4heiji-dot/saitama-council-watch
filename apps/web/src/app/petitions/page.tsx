import Link from "next/link";
import type { PetitionStatus, PetitionWithSource } from "@saitama-council-watch/shared-types";
import { fetchPetitions } from "@/lib/apiClient";
import { PETITION_STATUS_LABELS, PETITION_STATUS_ORDER } from "@/lib/petitionStatus";
import { PetitionStatusBadge } from "@/components/PetitionStatusBadge";

export const metadata = { title: "請願一覧 | さいたま市議会ウォッチ" };

interface PetitionsPageProps {
  searchParams: Promise<{ status?: string }>;
}

function isPetitionStatus(value: string): value is PetitionStatus {
  return (PETITION_STATUS_ORDER as string[]).includes(value);
}

function hrefFor(status: PetitionStatus | undefined): string {
  return status ? `/petitions?status=${status}` : "/petitions";
}

export default async function PetitionsPage({ searchParams }: PetitionsPageProps) {
  const { status: rawStatus } = await searchParams;
  const status = rawStatus && isPetitionStatus(rawStatus) ? rawStatus : undefined;

  const { items: allItems } = await fetchPetitions();
  const items = status ? allItems.filter((item) => item.status === status) : allItems;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">請願一覧{status ? `(${PETITION_STATUS_LABELS[status]})` : ""}</h1>
      <p className="mb-4 text-sm text-ink-muted">
        市議会議員の紹介を受けて提出された、市民からの請願の一覧です({items.length}件)。議会がどう対応したか(採択/不採択/取下げ)に加え、要旨を全文で読めます。
      </p>

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href={hrefFor(undefined)}
          className={`rounded-full border border-hairline px-3 py-1 ${!status ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          すべて
        </Link>
        {PETITION_STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={hrefFor(s)}
            className={`rounded-full border border-hairline px-3 py-1 ${status === s ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
          >
            {PETITION_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <ul className="divide-y divide-hairline">
        {items.map((item: PetitionWithSource) => (
          <li key={item.id} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-ink-primary">{item.title}</span>
              <PetitionStatusBadge status={item.status} />
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span>請願者: {item.petitionerName}</span>
              {item.committeeName && <span>付託委員会: {item.committeeName}</span>}
              {item.receivedDate && <span>受理日: {item.receivedDate}</span>}
              {item.decidedDate && <span>議決日: {item.decidedDate}</span>}
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-series-1 hover:underline">
                原本PDF
              </a>
            </div>
            {item.introducers.length > 0 && (
              <div className="mt-1 text-sm text-ink-muted">
                紹介議員:{" "}
                {item.introducers.map((introducer, index) => (
                  <span key={introducer.rawName}>
                    {index > 0 && "、"}
                    {introducer.legislatorId ? (
                      <Link href={`/legislators/${introducer.legislatorId}`} className="text-series-1 hover:underline">
                        {introducer.rawName}
                      </Link>
                    ) : (
                      introducer.rawName
                    )}
                  </span>
                ))}
              </div>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-series-1">要旨を見る</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-secondary">{item.summary}</p>
            </details>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-ink-muted">該当する請願が見つかりませんでした。</li>}
      </ul>
    </main>
  );
}
