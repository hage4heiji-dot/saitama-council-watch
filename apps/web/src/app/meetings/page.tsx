import Link from "next/link";
import { fetchMeetings } from "@/lib/apiClient";

export const metadata = { title: "会議一覧 | さいたま市議会ウォッチ" };

interface MeetingsPageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function MeetingsPage({ searchParams }: MeetingsPageProps) {
  const { sort } = await searchParams;
  const ascending = sort === "asc";

  const { items: itemsDesc } = await fetchMeetings(50);
  const items = ascending ? [...itemsDesc].reverse() : itemsDesc;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">会議一覧(定例会・臨時会)</h1>
      <p className="mb-4 text-sm text-ink-muted">出典: さいたま市議会公式サイト</p>

      <div className="mb-6 flex gap-2 text-sm">
        <Link
          href="/meetings"
          className={`rounded-full border border-hairline px-3 py-1 ${!ascending ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          新しい順
        </Link>
        <Link
          href="/meetings?sort=asc"
          className={`rounded-full border border-hairline px-3 py-1 ${ascending ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          古い順
        </Link>
      </div>

      <ul className="divide-y divide-hairline">
        {items.map((meeting) => (
          <li key={meeting.id} className="py-3">
            <Link href={`/meetings/${meeting.id}`} className="font-medium hover:underline">
              {meeting.sessionName}
            </Link>
            <div className="text-sm text-ink-muted">
              {meeting.startDate && meeting.endDate
                ? `会期: ${meeting.startDate} 〜 ${meeting.endDate}`
                : "会期: 未取得"}
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-ink-muted">会議データがまだありません。</li>}
      </ul>
    </main>
  );
}
