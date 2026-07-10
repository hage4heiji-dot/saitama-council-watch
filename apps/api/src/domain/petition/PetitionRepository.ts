import type { Petition, PetitionStatus } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertPetitionIntroducerInput {
  /** 原本の表記(捏造しない) */
  rawName: string;
  /** 既存Legislatorと一致した場合のみ設定する */
  legislatorId: string | null;
}

export interface UpsertPetitionInput {
  meetingId: string;
  petitionNumber: string;
  title: string;
  receivedDate: string | null;
  petitionerName: string;
  committeeName: string | null;
  summary: string;
  status: PetitionStatus;
  decidedDate: string | null;
  sourceDocumentId: string;
  introducers: UpsertPetitionIntroducerInput[];
}

export interface PetitionRepository {
  /** (meetingId, petitionNumber)の一意制約によりupsertする */
  upsertMany(inputs: UpsertPetitionInput[]): Promise<void>;
  /** 請願一覧画面向け。小規模データのため全件を受理日降順で返す(YAGNI) */
  findAll(): Promise<Petition[]>;
  /** 取り込み済みかどうかの判定用(再スクレイピング要否の判断、docs/adr/0016と同じ方針) */
  findByMeetingId(meetingId: string): Promise<Petition[]>;
  /** 議員詳細(活動記録)画面向け(docs/adr/0020)。指定議員が紹介した請願を返す */
  findByIntroducingLegislatorId(legislatorId: string): Promise<Petition[]>;
}
