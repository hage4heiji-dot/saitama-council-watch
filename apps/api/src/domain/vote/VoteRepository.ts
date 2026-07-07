import type { BillStatus, VoteType, VoteWithLegislator } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertVoteInput {
  billId: string;
  legislatorId: string;
  voteType: VoteType;
  votedAt: Date;
}

export interface VoteRepository {
  /** (billId, legislatorId)の一意制約によりupsertする(docs/adr/0017 議案表決態度の取り込み) */
  upsertMany(inputs: UpsertVoteInput[]): Promise<void>;
  /**
   * 指定した議案群のいずれかに投票記録が1件でもあるか。会期が既に同期済みかの判定に使う
   * (再スクレイピング回避)。表決態度PDFは会期内の一部の議案(人事案件等を除く)しか
   * 対象にしないため、単一の議案ではなく議案群全体で存在確認する。
   */
  existsForAnyBill(billIds: string[]): Promise<boolean>;
  /** 議案詳細画面向け。議員名・会派名を併記して返す */
  findByBillId(billId: string): Promise<VoteWithLegislator[]>;
  /** 議員×タグのクロス集計向け(docs/adr/0019)。全投票記録を議員・議案情報付きで返す */
  findAllWithBillInfo(): Promise<VoteWithBillInfo[]>;
}

export interface VoteWithBillInfo {
  legislatorId: string;
  legislatorName: string;
  factionName: string | null;
  billId: string;
  billSourceDocumentId: string;
  billStatus: BillStatus;
  voteType: VoteType;
}
