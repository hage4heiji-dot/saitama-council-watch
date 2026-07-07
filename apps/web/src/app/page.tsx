import Link from "next/link";
import type { BillStatus, Meeting } from "@saitama-council-watch/shared-types";
import { fetchBills, fetchLegislators, fetchMeetings, fetchTagCounts } from "@/lib/apiClient";
import { BILL_STATUS_LABELS, BILL_STATUS_ORDER } from "@/lib/billStatus";
import { computeSessionProgress } from "@/lib/sessionProgress";
import { FactionBar } from "@/components/FactionBar";
import { Meter } from "@/components/Meter";
import { StatTile } from "@/components/StatTile";

/** 会期の開始日が新しい順(未取得はもっとも古い扱い)。DB取得順(id順)は暦日と無関係なため */
function findLatestMeeting(meetings: Meeting[]): Meeting | null {
  if (meetings.length === 0) {
    return null;
  }
  return [...meetings].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? ""))[0] ?? null;
}

export default async function HomePage() {
  const { items: meetings } = await fetchMeetings(5);
  const latestMeeting = findLatestMeeting(meetings);

  // 議案の状況・タグ別件数は最新の会期のみを対象にする(過去の会期と合算しない)。
  // limitはAPIの上限(100)に合わせている。1会期で100件を超えたら集計専用の
  // エンドポイントを別途用意すること(現状のデータ規模ではYAGNI)。
  const [{ items: bills }, { items: legislators }, { items: tagCounts }] = await Promise.all([
    fetchBills(latestMeeting ? { meetingId: latestMeeting.id, limit: 100 } : { limit: 100 }),
    fetchLegislators(),
    fetchTagCounts(latestMeeting?.id),
  ]);

  const sessionProgress =
    latestMeeting?.startDate && latestMeeting.endDate
      ? computeSessionProgress(latestMeeting.startDate, latestMeeting.endDate)
      : null;

  const statusCounts = bills.reduce<Partial<Record<BillStatus, number>>>((acc, bill) => {
    acc[bill.status] = (acc[bill.status] ?? 0) + 1;
    return acc;
  }, {});

  const factionCounts = new Map<string, number>();
  for (const legislator of legislators) {
    const name = legislator.currentFaction?.name ?? "無所属・不明";
    factionCounts.set(name, (factionCounts.get(name) ?? 0) + 1);
  }
  const factions = [...factionCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold">さいたま市議会ウォッチ</h1>
      <p className="mb-8 text-ink-secondary">
        行政・議会・政治を、市民にわかりやすく整理・可視化するプラットフォームです。
      </p>

      {latestMeeting && sessionProgress && (
        <section className="mb-6">
          <Meter
            label={`${latestMeeting.sessionName}の会期`}
            value={sessionProgress.progress}
            detail={
              sessionProgress.status === "ended"
                ? `会期終了(${latestMeeting.startDate} 〜 ${latestMeeting.endDate})`
                : sessionProgress.status === "before"
                  ? `開会前(開会まで${sessionProgress.remainingDays}日)`
                  : `残り${sessionProgress.remainingDays}日(${latestMeeting.startDate} 〜 ${latestMeeting.endDate})`
            }
          />
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">
          議案の状況({latestMeeting ? `${latestMeeting.sessionName}、` : ""}
          {bills.length}件)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BILL_STATUS_ORDER.map((status) => (
            <StatTile
              key={status}
              label={BILL_STATUS_LABELS[status]}
              value={statusCounts[status] ?? 0}
              href={`/bills?status=${status}`}
            />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">
          議員(現職{legislators.length}名・{factions.length}会派)
        </h2>
        <FactionBar factions={factions} />
      </section>

      {tagCounts.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-semibold">
            議案のタグ別件数({latestMeeting ? `${latestMeeting.sessionName}、` : ""}AI要約承認済み分)
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tagCounts.map((tagCount) => (
              <StatTile
                key={tagCount.tag}
                label={tagCount.tag}
                value={tagCount.count}
                href={`/bills?tag=${encodeURIComponent(tagCount.tag)}`}
              />
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/legislators"
          className="flex-1 rounded-lg border border-hairline bg-surface-1 px-4 py-3 text-center hover:bg-surface-page"
        >
          議員一覧を見る
        </Link>
        <Link
          href="/meetings"
          className="flex-1 rounded-lg border border-hairline bg-surface-1 px-4 py-3 text-center hover:bg-surface-page"
        >
          会議・議案を見る
        </Link>
        <Link
          href="/search"
          className="flex-1 rounded-lg border border-hairline bg-surface-1 px-4 py-3 text-center hover:bg-surface-page"
        >
          議案を検索する
        </Link>
      </div>
    </main>
  );
}
