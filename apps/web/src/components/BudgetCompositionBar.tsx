import { SERIES_COLORS } from "@/lib/seriesColors";

/**
 * 歳入・歳出の構成比(部分ー全体、dataviz skill: part-to-whole → stacked bar)。
 * FactionBarと同じ構成(積み上げバー+凡例)を踏襲する。款は年度・会計によって
 * 最大25件程度あり、カテゴリカル色は8色までしか安全に見分けられないため、
 * 金額が大きい上位7款だけ個別の色を割り当て、残りは中立色(--baseline)の
 * 「その他」にまとめる(dataviz skillの「9番目以降は色を生成せずOtherに畳む」方針)。
 */
const TOP_N = 7;

export interface BudgetCategoryAmount {
  category: string;
  amount: number;
}

interface BudgetCompositionBarProps {
  categories: BudgetCategoryAmount[];
  /** 積み上げバーのaria-label用(例:「2026年度一般会計 歳入」) */
  label: string;
}

function formatPercent(amount: number, total: number): string {
  return `${((amount / total) * 100).toFixed(1)}%`;
}

export function BudgetCompositionBar({ categories, label }: BudgetCompositionBarProps) {
  const total = categories.reduce((sum, c) => sum + c.amount, 0);
  if (total === 0) {
    return null;
  }

  const sorted = [...categories].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, TOP_N);
  const otherAmount = sorted.slice(TOP_N).reduce((sum, c) => sum + c.amount, 0);
  const segments: (BudgetCategoryAmount & { color: string })[] = top.map((c, i) => ({
    ...c,
    color: SERIES_COLORS[i % SERIES_COLORS.length]!,
  }));
  if (otherAmount > 0) {
    segments.push({ category: "その他", amount: otherAmount, color: "var(--baseline)" });
  }

  return (
    <div>
      <div
        className="flex h-6 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`${label}の構成: ${segments.map((s) => `${s.category} ${formatPercent(s.amount, total)}`).join("、")}`}
      >
        {segments.map((segment) => (
          <div
            key={segment.category}
            className="h-full border-r-2 border-surface-1 last:border-r-0"
            style={{ width: `${(segment.amount / total) * 100}%`, backgroundColor: segment.color }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
        {segments.map((segment) => (
          <li key={segment.category} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />
            <span className="text-ink-primary">{segment.category}</span>
            <span className="text-ink-muted">{formatPercent(segment.amount, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
