import type { CommitteeMeeting } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertCommitteeMeetingInput {
  date: string;
  time: string | null;
  committeeName: string;
  /** 対応するMeeting(会期)。dateがその会期の期間内と判定できた場合のみ設定する */
  meetingId: string | null;
}

export interface CommitteeMeetingRepository {
  /** (date, committeeName)の一意制約によりupsertする */
  upsertMany(inputs: UpsertCommitteeMeetingInput[]): Promise<void>;
  /** 年間マイルストーン画面向け。全件を日付昇順で返す(小規模データのためページネーションなし) */
  findAll(): Promise<CommitteeMeeting[]>;
}
