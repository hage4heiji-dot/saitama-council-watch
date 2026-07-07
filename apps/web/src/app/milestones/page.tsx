import type { CommitteeMeeting } from "@saitama-council-watch/shared-types";
import { fetchCommitteeMeetings } from "@/lib/apiClient";

export const metadata = { title: "年間マイルストーン | さいたま市議会ウォッチ" };

interface MonthGroup {
  yearMonth: string; // YYYY-MM
  label: string; // "2026年2月"
  /** committeeBaseName -> その月に開催があった日付(重複除去) */
  daysByCommittee: Map<string, Set<string>>;
}

function groupByMonth(items: CommitteeMeeting[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const item of items) {
    const yearMonth = item.date.slice(0, 7);
    let group = groups.get(yearMonth);
    if (!group) {
      const [year, month] = yearMonth.split("-");
      group = { yearMonth, label: `${year}年${Number(month)}月`, daysByCommittee: new Map() };
      groups.set(yearMonth, group);
    }
    const days = group.daysByCommittee.get(item.committeeBaseName) ?? new Set<string>();
    days.add(item.date);
    group.daysByCommittee.set(item.committeeBaseName, days);
  }

  return [...groups.values()].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export default async function MilestonesPage() {
  const { items } = await fetchCommitteeMeetings();
  const months = groupByMonth(items);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">年間マイルストーン</h1>
      <p className="mb-6 text-sm text-ink-muted">
        本会議・委員会がいつ開催されているか、月ごとにまとめたものです(例:
        予算委員会は例年2〜3月、決算特別委員会は例年9〜10月に集中します)。出典:
        さいたま市議会公式サイト「会議日程一覧」。
      </p>

      {months.length === 0 ? (
        <p className="text-ink-muted">会議日程データがまだありません。</p>
      ) : (
        <ul className="space-y-4">
          {months.map((month) => (
            <li key={month.yearMonth} className="rounded-lg border border-hairline bg-surface-1 p-4">
              <h2 className="mb-2 font-semibold text-ink-primary">{month.label}</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                {[...month.daysByCommittee.entries()]
                  .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], "ja"))
                  .map(([committeeName, days]) => (
                    <span
                      key={committeeName}
                      className="rounded-full border border-hairline bg-surface-page px-3 py-1 text-ink-secondary"
                    >
                      {committeeName}({days.size}日)
                    </span>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
