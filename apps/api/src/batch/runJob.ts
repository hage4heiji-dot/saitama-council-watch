import { prisma } from "../infrastructure/db/postgres/prismaClient.js";

/**
 * 全バッチジョブ共通の実行ラッパー。batch_job_runsへの記録と冪等な失敗検知
 * (docs/design/01-basic-design.md §7)を一箇所に閉じ込める。
 * 個々のジョブ(スクレイパー/パーサー/AIパイプライン/通知)はこの関数を通して登録すること。
 */
export async function runJob(jobName: string, task: () => Promise<number>): Promise<void> {
  const run = await prisma.batchJobRun.create({
    data: { jobName, startedAt: new Date(), status: "RUNNING" },
  });

  try {
    const recordsProcessed = await task();
    await prisma.batchJobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: "SUCCEEDED", recordsProcessed },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await prisma.batchJobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: "FAILED", errorMessage },
    });
    throw error;
  }
}
