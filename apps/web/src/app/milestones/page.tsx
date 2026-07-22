import type { CommitteeMeeting } from "@saitama-council-watch/shared-types";
import { fetchCommitteeMeetings } from "@/lib/apiClient";

export const metadata = { title: "年間マイルストーン | さいたま市議会ウォッチ" };

interface CalendarMonthGroup {
  month: number; // 1-12
  label: string; // "4月"
  /** committeeBaseName -> 開催があった日付(年をまたいで集計・重複除去) */
  daysByCommittee: Map<string, Set<string>>;
}

/** 4月始まり(年度)の順序でカレンダー月を並べる */
const FISCAL_YEAR_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

/**
 * 年をまたいで月番号だけで集計し、年度内でどの時期に何が起きやすいかという
 * 「通常の流れ」を見せる。特定の年の予定ではなく、これまでの実績から見える傾向。
 */
function groupByCalendarMonth(items: CommitteeMeeting[]): CalendarMonthGroup[] {
  const groups = new Map<number, CalendarMonthGroup>(
    FISCAL_YEAR_MONTH_ORDER.map((month) => [month, { month, label: `${month}月`, daysByCommittee: new Map() }]),
  );

  for (const item of items) {
    const month = Number(item.date.slice(5, 7));
    const group = groups.get(month);
    if (!group) continue;
    const days = group.daysByCommittee.get(item.committeeBaseName) ?? new Set<string>();
    days.add(item.date);
    group.daysByCommittee.set(item.committeeBaseName, days);
  }

  return FISCAL_YEAR_MONTH_ORDER.map((month) => groups.get(month)!);
}

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

  return [...groups.values()].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}

export default async function MilestonesPage() {
  const { items } = await fetchCommitteeMeetings();
  const calendarMonths = groupByCalendarMonth(items);
  const months = groupByMonth(items);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">年間マイルストーン</h1>
      <p className="mb-6 text-sm text-ink-muted">
        本会議・委員会がいつ開催されているか、月ごとにまとめたものです(例:
        予算委員会は例年2〜3月、決算特別委員会は例年9〜10月に集中します)。出典:
        さいたま市議会公式サイト「会議日程一覧」。
      </p>

      <section className="mb-10">
        <h2 className="mb-1 font-semibold text-ink-primary">年度内の通常の流れ(4月始まり)</h2>
        <p className="mb-4 text-sm text-ink-muted">
          特定の年の予定ではなく、これまでの実績データから見える「毎年の傾向」です。データが蓄積されるほど精度が上がります。
        </p>
        <ul className="space-y-4">
          {calendarMonths.map((month) => (
            <li key={month.month} className="rounded-lg border border-hairline bg-surface-1 p-4">
              <h3 className="mb-2 font-semibold text-ink-primary">{month.label}</h3>
              {month.daysByCommittee.size === 0 ? (
                <p className="text-sm text-ink-muted">実績データなし</p>
              ) : (
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
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 font-semibold text-ink-primary">実績一覧(新しい月順)</h2>
        {months.length === 0 ? (
          <p className="text-ink-muted">会議日程データがまだありません。</p>
        ) : (
          <ul className="space-y-4">
            {months.map((month) => (
              <li key={month.yearMonth} className="rounded-lg border border-hairline bg-surface-1 p-4">
                <h3 className="mb-2 font-semibold text-ink-primary">{month.label}</h3>
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
      </section>
    </main>
  );
}
