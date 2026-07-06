import type { BillStatus } from "@saitama-council-watch/shared-types";

/**
 * ステータス色は識別色(会派等)とは別系統で固定(dataviz skillのstatus palette)。
 * 色だけに意味を持たせず、常にラベルと併記する。
 */
const STATUS_CONFIG: Record<BillStatus, { label: string; colorVar: string }> = {
  submitted: { label: "提出", colorVar: "var(--text-muted)" },
  in_deliberation: { label: "審議中", colorVar: "var(--status-warning)" },
  passed: { label: "可決", colorVar: "var(--status-good)" },
  rejected: { label: "否決", colorVar: "var(--status-critical)" },
  carried_over: { label: "継続審議", colorVar: "var(--status-serious)" },
};

export function StatusBadge({ status }: { status: BillStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-2.5 py-0.5 text-xs font-medium text-ink-primary">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: config.colorVar }}
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}
