import { resolve } from "node:path";
import { ingestBills } from "../../application/ingestBills/IngestBillsUseCase.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBillRepository } from "../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { runJob } from "../runJob.js";

/**
 * 議案スクレイピングジョブ(Phase1)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api scrape:bills` で単体実行できる。
 */
export async function scrapeBillsJob(): Promise<number> {
  const result = await ingestBills(
    {
      documentRepository: new PrismaDocumentRepository(prisma),
      meetingRepository: new PrismaMeetingRepository(prisma),
      billRepository: new PrismaBillRepository(prisma),
      rawStorageRoot: resolve(process.cwd(), env.RAW_STORAGE_PATH),
    },
    { sessionLimit: env.SCRAPE_BILLS_SESSION_LIMIT },
  );

  console.warn(
    `scrape-bills: sessions=${result.sessionsProcessed} bills=${result.billsUpserted} newDocuments=${result.documentsCreated}`,
  );
  return result.billsUpserted;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("scrape-bills", scrapeBillsJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
