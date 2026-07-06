import type { Faction as PrismaFaction, PrismaClient } from "@prisma/client";
import type { Faction } from "@saitama-council-watch/shared-types";
import type { FactionRepository } from "../../../../domain/faction/FactionRepository.js";

export function toFactionDomain(row: PrismaFaction): Faction {
  return {
    id: row.id,
    name: row.name,
    foundedDate: row.foundedDate ? row.foundedDate.toISOString().slice(0, 10) : null,
    isActive: row.isActive,
  };
}

export class PrismaFactionRepository implements FactionRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertByName(name: string): Promise<Faction> {
    const row = await this.client.faction.upsert({
      where: { name },
      create: { name },
      update: {},
    });
    return toFactionDomain(row);
  }
}
