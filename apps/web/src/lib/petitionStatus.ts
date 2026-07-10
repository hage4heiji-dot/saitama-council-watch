import type { PetitionStatus } from "@saitama-council-watch/shared-types";

/**
 * 請願ステータスの表示ラベル・色。議案のステータス表示(lib/billStatus.ts、
 * components/StatusBadge.tsx)と同じ方針で一元管理する(docs/adr/0026)。
 */
export const PETITION_STATUS_LABELS: Record<PetitionStatus, string> = {
  pending: "審議中",
  adopted: "採択",
  rejected: "不採択",
  withdrawn: "取下げ",
  carried_over: "継続審査",
  unconfirmed: "不明",
};

export const PETITION_STATUS_ORDER: PetitionStatus[] = [
  "pending",
  "adopted",
  "rejected",
  "withdrawn",
  "carried_over",
  "unconfirmed",
];

export const PETITION_STATUS_COLORS: Record<PetitionStatus, string> = {
  pending: "var(--status-warning)",
  adopted: "var(--status-good)",
  rejected: "var(--status-critical)",
  withdrawn: "var(--text-muted)",
  carried_over: "var(--status-serious)",
  unconfirmed: "var(--text-muted)",
};
