import type { PetitionStatus } from "@saitama-council-watch/shared-types";
import { PETITION_STATUS_COLORS, PETITION_STATUS_LABELS } from "@/lib/petitionStatus";

/** components/StatusBadge.tsx(議案用)と同じ方針。色だけに意味を持たせず常にラベルと併記する */
export function PetitionStatusBadge({ status }: { status: PetitionStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-1 px-2.5 py-0.5 text-xs font-medium text-ink-primary">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: PETITION_STATUS_COLORS[status] }}
        aria-hidden="true"
      />
      {PETITION_STATUS_LABELS[status]}
    </span>
  );
}
