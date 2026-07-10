import { resolve } from "node:path";
import { ingestPetitions } from "../../application/ingestPetitions/IngestPetitionsUseCase.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaDocumentRepository } from "../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaLegislatorRepository } from "../../infrastructure/db/postgres/repositories/PrismaLegislatorRepository.js";
import { PrismaMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { PrismaPetitionRepository } from "../../infrastructure/db/postgres/repositories/PrismaPetitionRepository.js";
import { runJob } from "../runJob.js";

/**
 * 請願の取り込みジョブ(docs/adr/0026)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api ingest:petitions` で単体実行できる。
 */
export async function ingestPetitionsJob(): Promise<number> {
  const result = await ingestPetitions({
    meetingRepository: new PrismaMeetingRepository(prisma),
    petitionRepository: new PrismaPetitionRepository(prisma),
    legislatorRepository: new PrismaLegislatorRepository(prisma),
    documentRepository: new PrismaDocumentRepository(prisma),
    rawStorageRoot: resolve(process.cwd(), env.RAW_STORAGE_PATH),
    now: new Date(),
  });

  console.warn(
    `ingest-petitions: meetings=${result.meetingsProcessed} petitionsUpserted=${result.petitionsUpserted} lateResultsResolved=${result.lateResultsResolved}`,
  );
  return result.petitionsUpserted;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("ingest-petitions", ingestPetitionsJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
