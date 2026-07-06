import Link from "next/link";
import { fetchMeetings } from "@/lib/apiClient";

export const metadata = { title: "会議一覧 | さいたま市議会ウォッチ" };

export default async function MeetingsPage() {
  const { items } = await fetchMeetings(50);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">会議一覧(定例会・臨時会)</h1>
      <p className="mb-6 text-sm text-gray-500">出典: さいたま市議会公式サイト</p>
      <ul className="divide-y divide-gray-200">
        {items.map((meeting) => (
          <li key={meeting.id} className="py-3">
            <Link href={`/meetings/${meeting.id}`} className="font-medium hover:underline">
              {meeting.sessionName}
            </Link>
            <div className="text-sm text-gray-500">
              {meeting.startDate && meeting.endDate
                ? `会期: ${meeting.startDate} 〜 ${meeting.endDate}`
                : "会期: 未取得"}
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-3 text-gray-500">会議データがまだありません。</li>}
      </ul>
    </main>
  );
}
