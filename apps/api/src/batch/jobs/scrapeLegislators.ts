import { ingestLegislators } from "../../application/ingestLegislators/IngestLegislatorsUseCase.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaFactionRepository } from "../../infrastructure/db/postgres/repositories/PrismaFactionRepository.js";
import { PrismaLegislatorRepository } from "../../infrastructure/db/postgres/repositories/PrismaLegislatorRepository.js";
import { runJob } from "../runJob.js";

/**
 * 議員・会派スクレイピングジョブ(Phase2)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api scrape:legislators` で単体実行できる。
 */
export async function scrapeLegislatorsJob(): Promise<number> {
  const scrapedAt = new Date().toISOString().slice(0, 10);
  const result = await ingestLegislators(
    {
      legislatorRepository: new PrismaLegislatorRepository(prisma),
      factionRepository: new PrismaFactionRepository(prisma),
    },
    { scrapedAt },
  );

  console.warn(
    `scrape-legislators: legislators=${result.legislatorsUpserted} factions=${result.factionsUpserted}`,
  );
  return result.legislatorsUpserted;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("scrape-legislators", scrapeLegislatorsJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
