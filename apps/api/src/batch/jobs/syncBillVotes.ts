import { syncBillVotes } from "../../application/syncBillVotes/SyncBillVotesUseCase.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBillRepository } from "../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaLegislatorRepository } from "../../infrastructure/db/postgres/repositories/PrismaLegislatorRepository.js";
import { PrismaMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { PrismaVoteRepository } from "../../infrastructure/db/postgres/repositories/PrismaVoteRepository.js";
import { runJob } from "../runJob.js";

/**
 * 議案表決態度の同期ジョブ(docs/adr/0017)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api sync:bill-votes` で単体実行できる。
 */
export async function syncBillVotesJob(): Promise<number> {
  const result = await syncBillVotes({
    meetingRepository: new PrismaMeetingRepository(prisma),
    billRepository: new PrismaBillRepository(prisma),
    legislatorRepository: new PrismaLegislatorRepository(prisma),
    voteRepository: new PrismaVoteRepository(prisma),
    now: new Date(),
  });

  console.warn(`sync-bill-votes: meetings=${result.meetingsProcessed} votesUpserted=${result.votesUpserted}`);
  return result.votesUpserted;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("sync-bill-votes", syncBillVotesJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
