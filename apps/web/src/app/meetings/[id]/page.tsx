import { notFound } from "next/navigation";
import Link from "next/link";
import { fetchBills, fetchMeeting } from "@/lib/apiClient";

interface MeetingPageProps {
  params: Promise<{ id: string }>;
}

export default async function MeetingDetailPage({ params }: MeetingPageProps) {
  const { id } = await params;
  const meeting = await fetchMeeting(id);
  if (!meeting) {
    notFound();
  }

  const { items: bills } = await fetchBills({ meetingId: meeting.id, limit: 100 });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">{meeting.sessionName}</h1>
      <p className="mb-6 text-sm text-gray-500">
        {meeting.startDate && meeting.endDate
          ? `会期: ${meeting.startDate} 〜 ${meeting.endDate}`
          : "会期: 未取得"}
        (出典: さいたま市議会公式サイト)
      </p>

      <h2 className="mb-3 font-semibold">議案一覧({bills.length}件)</h2>
      <ul className="divide-y divide-gray-200">
        {bills.map((bill) => (
          <li key={bill.id} className="py-3">
            <Link href={`/bills/${bill.id}`} className="font-medium hover:underline">
              {bill.billNumber} {bill.title}
            </Link>
            <div className="mt-1 flex gap-3 text-sm text-gray-500">
              <span>{bill.submittedDate ? `提出日: ${bill.submittedDate}` : "提出日: 未取得"}</span>
              <a
                href={bill.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline"
              >
                原本PDF
              </a>
            </div>
          </li>
        ))}
        {bills.length === 0 && <li className="py-3 text-gray-500">議案データがまだありません。</li>}
      </ul>
    </main>
  );
}
