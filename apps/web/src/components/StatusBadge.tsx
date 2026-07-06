import type { BillStatus } from "@saitama-council-watch/shared-types";
import { BILL_STATUS_LABELS } from "@/lib/billStatus";

/**
 * ステータス色は識別色(会派等)とは別系統で固定(dataviz skillのstatus palette)。
 * 色だけに意味を持たせず、常にラベルと併記する。
 */
const STATUS_COLORS: Record<BillStatus, string> = {
  submitted: "var(--text-muted)",
  in_deliberation: "var(--status-warning)",
  passed: "var(--status-good)",
  rejected: "var(--status-critical)",
  carried_over: "var(--status-serious)",
  unconfirmed: "var(--text-muted)",
};

export function StatusBadge({ status }: { status: BillStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-2.5 py-0.5 text-xs font-medium text-ink-primary">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: STATUS_COLORS[status] }}
        aria-hidden="true"
      />
      {BILL_STATUS_LABELS[status]}
    </span>
  );
}
