import type { Faction, Legislator } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertLegislatorInput {
  name: string;
  nameKana: string;
  profileUrl: string;
}

export interface LegislatorRepository {
  upsertByProfileUrl(input: UpsertLegislatorInput): Promise<Legislator>;
  /**
   * 現在の所属会派を設定する。既存の所属と異なる場合は旧履歴のvalidToを閉じ、
   * 新しい履歴行を追加する(会派移動の履歴を保持する設計、docs/design/01-basic-design.md §3.1)。
   */
  setCurrentFaction(legislatorId: string, factionId: string, asOfDate: string): Promise<void>;
  /** includeInactive=trueで元議員(is_active=false)も含める(docs/adr/0020) */
  findAll(options?: { includeInactive?: boolean }): Promise<Legislator[]>;
  findById(id: string): Promise<Legislator | null>;
  /** 会派移動履歴(現在の所属を含む全履歴)。議員詳細画面向け */
  findFactionHistory(legislatorId: string): Promise<LegislatorFactionHistoryEntry[]>;
}

export interface LegislatorFactionHistoryEntry {
  faction: Faction;
  validFrom: string;
  validTo: string | null;
}
