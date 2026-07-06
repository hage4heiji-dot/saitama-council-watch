import Link from "next/link";
import type { BillStatus } from "@saitama-council-watch/shared-types";
import { fetchBills, fetchLegislators, fetchMeetings } from "@/lib/apiClient";
import { computeSessionProgress } from "@/lib/sessionProgress";
import { FactionBar } from "@/components/FactionBar";
import { Meter } from "@/components/Meter";
import { StatTile } from "@/components/StatTile";

const BILL_STATUS_ORDER: { status: BillStatus; label: string }[] = [
  { status: "in_deliberation", label: "審議中" },
  { status: "passed", label: "可決" },
  { status: "rejected", label: "否決" },
  { status: "carried_over", label: "継続審議" },
  { status: "submitted", label: "提出" },
  { status: "unconfirmed", label: "詳細要確認" },
];

export default async function HomePage() {
  // limitはAPIの上限(100)に合わせている。100件を超えたら集計専用の
  // エンドポイントを別途用意すること(現状のデータ規模ではYAGNI)。
  const [{ items: meetings }, { items: bills }, { items: legislators }] = await Promise.all([
    fetchMeetings(5),
    fetchBills({ limit: 100 }),
    fetchLegislators(),
  ]);

  const latestMeeting = meetings[0] ?? null;
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
        <h2 className="mb-3 font-semibold">議案の状況(累計{bills.length}件)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {BILL_STATUS_ORDER.map(({ status, label }) => (
            <StatTile key={status} label={label} value={statusCounts[status] ?? 0} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 font-semibold">
          議員(現職{legislators.length}名・{factions.length}会派)
        </h2>
        <FactionBar factions={factions} />
      </section>

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
