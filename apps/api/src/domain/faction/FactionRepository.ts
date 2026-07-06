import type { Faction } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface FactionRepository {
  upsertByName(name: string): Promise<Faction>;
}
