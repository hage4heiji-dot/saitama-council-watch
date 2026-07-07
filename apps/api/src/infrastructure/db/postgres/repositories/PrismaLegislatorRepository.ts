import type { Legislator as PrismaLegislator, PrismaClient } from "@prisma/client";
import type { Legislator } from "@saitama-council-watch/shared-types";
import type {
  LegislatorFactionHistoryEntry,
  LegislatorRepository,
  UpsertLegislatorInput,
} from "../../../../domain/legislator/LegislatorRepository.js";
import { toFactionDomain } from "./PrismaFactionRepository.js";

type LegislatorWithCurrentFaction = PrismaLegislator & {
  factionHistory: { faction: Parameters<typeof toFactionDomain>[0] }[];
};

function toDomain(row: LegislatorWithCurrentFaction): Legislator {
  const currentFaction = row.factionHistory[0]?.faction ?? null;
  return {
    id: row.id,
    name: row.name,
    nameKana: row.nameKana,
    firstElectedDate: row.firstElectedDate ? row.firstElectedDate.toISOString().slice(0, 10) : null,
    isActive: row.isActive,
    profileUrl: row.profileUrl,
    currentFaction: currentFaction ? toFactionDomain(currentFaction) : null,
  };
}

const CURRENT_FACTION_INCLUDE = {
  factionHistory: {
    where: { validTo: null },
    include: { faction: true },
    take: 1,
  },
} as const;

export class PrismaLegislatorRepository implements LegislatorRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertByProfileUrl(input: UpsertLegislatorInput): Promise<Legislator> {
    const row = await this.client.legislator.upsert({
      where: { profileUrl: input.profileUrl },
      create: {
        name: input.name,
        nameKana: input.nameKana,
        profileUrl: input.profileUrl,
      },
      update: {
        name: input.name,
        nameKana: input.nameKana,
      },
      include: CURRENT_FACTION_INCLUDE,
    });
    return toDomain(row);
  }

  async setCurrentFaction(legislatorId: string, factionId: string, asOfDate: string): Promise<void> {
    const current = await this.client.legislatorFactionHistory.findFirst({
      where: { legislatorId, validTo: null },
    });

    if (current?.factionId === factionId) {
      return; // 変更なし
    }

    await this.client.$transaction(async (tx) => {
      if (current) {
        await tx.legislatorFactionHistory.update({
          where: { id: current.id },
          data: { validTo: new Date(asOfDate) },
        });
      }
      await tx.legislatorFactionHistory.create({
        data: {
          legislatorId,
          factionId,
          validFrom: new Date(asOfDate),
        },
      });
    });
  }

  async findAll(options?: { includeInactive?: boolean }): Promise<Legislator[]> {
    const rows = await this.client.legislator.findMany({
      ...(options?.includeInactive ? {} : { where: { isActive: true } }),
      include: CURRENT_FACTION_INCLUDE,
      orderBy: { nameKana: "asc" },
    });
    return rows.map(toDomain);
  }

  async findById(id: string): Promise<Legislator | null> {
    const row = await this.client.legislator.findUnique({
      where: { id },
      include: CURRENT_FACTION_INCLUDE,
    });
    return row ? toDomain(row) : null;
  }

  async findFactionHistory(legislatorId: string): Promise<LegislatorFactionHistoryEntry[]> {
    const rows = await this.client.legislatorFactionHistory.findMany({
      where: { legislatorId },
      include: { faction: true },
      orderBy: { validFrom: "asc" },
    });
    return rows.map((row) => ({
      faction: toFactionDomain(row.faction),
      validFrom: row.validFrom.toISOString().slice(0, 10),
      validTo: row.validTo ? row.validTo.toISOString().slice(0, 10) : null,
    }));
  }
}
