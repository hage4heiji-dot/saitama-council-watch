/**
 * 単一の現在値を見せるための最小単位(dataviz skill: 「単一の現在値」→Stat tile)。
 */
interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 p-4">
      <div className="text-sm text-ink-secondary">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink-primary">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}
