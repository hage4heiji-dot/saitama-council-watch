/**
 * 会派別議席構成(部分ー全体、dataviz skill: part-to-whole → stacked bar)。
 * 色は会派名の固定順で割り当てる(ランクではなく実体に紐づける。
 * 議席数が変わっても同じ会派は常に同じ色になる)。
 * 7会派は「4以上は直接ラベル必須」のラダーに該当するため、凡例に名前と件数を必ず併記する。
 */
const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];

export interface FactionSeat {
  name: string;
  count: number;
}

interface FactionBarProps {
  /** 呼び出し側で会派名の安定した順序(例: 名前順)にソート済みであること */
  factions: FactionSeat[];
}

export function FactionBar({ factions }: FactionBarProps) {
  const total = factions.reduce((sum, faction) => sum + faction.count, 0);
  if (total === 0) {
    return null;
  }

  return (
    <div>
      <div
        className="flex h-6 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`会派別議席構成: ${factions.map((f) => `${f.name} ${f.count}議席`).join("、")}`}
      >
        {factions.map((faction, index) => (
          <div
            key={faction.name}
            className="h-full border-r-2 border-surface-1 last:border-r-0"
            style={{
              width: `${(faction.count / total) * 100}%`,
              backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length],
            }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {factions.map((faction, index) => (
          <li key={faction.name} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
              aria-hidden="true"
            />
            <span className="text-ink-primary">{faction.name}</span>
            <span className="text-ink-muted">{faction.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
