/**
 * 「上限に対する単一の比率」向けの表示(dataviz skill: 会期進捗のようなケース)。
 * 塗りは同一ランプの濃い段(series-1)、未塗り部分は同じランプの薄い段(sequential-100)。
 */
interface MeterProps {
  label: string;
  value: number; // 0-100
  detail?: string;
}

export function Meter({ label, value, detail }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-ink-secondary">{label}</span>
        <span className="text-2xl font-semibold text-ink-primary">{Math.round(clamped)}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sequential-100">
        <div className="h-full rounded-full bg-series-1" style={{ width: `${clamped}%` }} />
      </div>
      {detail && <div className="mt-2 text-xs text-ink-muted">{detail}</div>}
    </div>
  );
}
