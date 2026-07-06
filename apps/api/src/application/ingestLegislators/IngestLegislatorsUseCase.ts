import type { FactionRepository } from "../../domain/faction/FactionRepository.js";
import type { LegislatorRepository } from "../../domain/legislator/LegislatorRepository.js";
import { listLegislators } from "../../infrastructure/scraper/saitamaLegislatorsScraper.js";

export interface IngestLegislatorsDeps {
  legislatorRepository: LegislatorRepository;
  factionRepository: FactionRepository;
}

export interface IngestLegislatorsOptions {
  /** 会派履歴のvalidFrom/validToに使うISO日付(通常はスクレイピング実行日) */
  scrapedAt: string;
}

export interface IngestLegislatorsResult {
  legislatorsUpserted: number;
  factionsUpserted: number;
}

/**
 * 議員・会派スクレイピング〜Postgres投入ユースケース(Phase2、AI不使用)。
 * 会派移動があった場合はLegislatorFactionHistoryに新しい行を追加し、
 * 旧所属のvalidToを閉じる(履歴を保持する設計、docs/design/01-basic-design.md §3.1)。
 *
 * 注: validFromはスクレイピングで初めて観測した日であり、実際にその会派へ
 * 加入した日ではない(原本にない正確な加入日を捏造しない)。
 */
export async function ingestLegislators(
  deps: IngestLegislatorsDeps,
  options: IngestLegislatorsOptions,
): Promise<IngestLegislatorsResult> {
  const scraped = await listLegislators();

  const factionIdByName = new Map<string, string>();
  let factionsUpserted = 0;

  for (const item of scraped) {
    const legislator = await deps.legislatorRepository.upsertByProfileUrl({
      name: item.name,
      nameKana: item.nameKana,
      profileUrl: item.profileUrl,
    });

    if (!item.factionName) {
      continue;
    }

    let factionId = factionIdByName.get(item.factionName);
    if (!factionId) {
      const faction = await deps.factionRepository.upsertByName(item.factionName);
      factionId = faction.id;
      factionIdByName.set(item.factionName, factionId);
      factionsUpserted += 1;
    }

    await deps.legislatorRepository.setCurrentFaction(legislator.id, factionId, options.scrapedAt);
  }

  return { legislatorsUpserted: scraped.length, factionsUpserted };
}
