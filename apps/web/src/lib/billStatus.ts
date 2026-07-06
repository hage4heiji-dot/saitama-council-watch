import type { BillStatus } from "@saitama-council-watch/shared-types";

/**
 * 議案ステータスの表示ラベル。ホーム画面の集計タイル・議案一覧・個別バッジで
 * 表記がずれないよう、ここで一元管理する。
 */
export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  in_deliberation: "審議中",
  passed: "可決",
  rejected: "否決",
  carried_over: "継続審議",
  submitted: "提出",
  // 会期終了後も原本(委員会審査結果報告等)から結果を特定できなかった議案(docs/adr/0016)
  unconfirmed: "不明",
};

export const BILL_STATUS_ORDER: BillStatus[] = [
  "in_deliberation",
  "passed",
  "rejected",
  "carried_over",
  "submitted",
  "unconfirmed",
];
