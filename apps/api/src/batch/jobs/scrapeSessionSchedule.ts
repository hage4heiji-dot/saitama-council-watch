import { ingestSessionSchedule } from "../../application/ingestSessionSchedule/IngestSessionScheduleUseCase.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaMeetingRepository } from "../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { runJob } from "../runJob.js";

/**
 * 会期予定表(開始日・終了日)の取り込みジョブ(Phase1b、docs/adr/0011)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api scrape:schedule` で単体実行できる。
 */
export async function scrapeSessionScheduleJob(): Promise<number> {
  const result = await ingestSessionSchedule(
    { meetingRepository: new PrismaMeetingRepository(prisma) },
    { sessionLimit: env.SCRAPE_SCHEDULE_SESSION_LIMIT },
  );

  console.warn(
    `scrape-session-schedule: sessionsChecked=${result.sessionsChecked} meetingsUpdated=${result.meetingsUpdated}`,
  );
  return result.meetingsUpdated;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("scrape-session-schedule", scrapeSessionScheduleJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
