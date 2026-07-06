import { syncBillDeliberationResults } from "../../application/syncBillDeliberationResults/SyncBillDeliberationResultsUseCase.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBillRepository } from "../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { runJob } from "../runJob.js";

/**
 * 議案審議結果の同期ジョブ(docs/adr/0016)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api sync:bill-status` で単体実行できる。
 */
export async function syncBillDeliberationResultsJob(): Promise<number> {
  const result = await syncBillDeliberationResults({
    meetingRepository: new PrismaMeetingRepository(prisma),
    billRepository: new PrismaBillRepository(prisma),
    now: new Date(),
  });

  console.warn(
    `sync-bill-deliberation-results: meetings=${result.meetingsProcessed} updated=${result.billsUpdated} unconfirmed=${result.billsMarkedUnconfirmed}`,
  );
  return result.billsUpdated + result.billsMarkedUnconfirmed;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("sync-bill-deliberation-results", syncBillDeliberationResultsJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
