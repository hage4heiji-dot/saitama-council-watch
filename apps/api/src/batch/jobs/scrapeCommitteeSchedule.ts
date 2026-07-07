import { ingestCommitteeSchedule } from "../../application/ingestCommitteeSchedule/IngestCommitteeScheduleUseCase.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaCommitteeMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaCommitteeMeetingRepository.js";
import { PrismaMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { runJob } from "../runJob.js";

/**
 * 会議日程一覧(本会議・委員会の個別日程)の取り込みジョブ(docs/adr/0023)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api scrape:committee-schedule` で単体実行できる。
 */
export async function scrapeCommitteeScheduleJob(): Promise<number> {
  const result = await ingestCommitteeSchedule({
    committeeMeetingRepository: new PrismaCommitteeMeetingRepository(prisma),
    meetingRepository: new PrismaMeetingRepository(prisma),
  });

  console.warn(`scrape-committee-schedule: entriesScraped=${result.entriesScraped}`);
  return result.entriesScraped;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("scrape-committee-schedule", scrapeCommitteeScheduleJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
