import cron from "node-cron";
import { generateAiContentJob } from "./jobs/generateAiContent.js";
import { scrapeBillsJob } from "./jobs/scrapeBills.js";
import { scrapeLegislatorsJob } from "./jobs/scrapeLegislators.js";
import { scrapeSessionScheduleJob } from "./jobs/scrapeSessionSchedule.js";
import { syncBillDeliberationResultsJob } from "./jobs/syncBillDeliberationResults.js";
import { syncBillVotesJob } from "./jobs/syncBillVotes.js";
import { runJob } from "./runJob.js";
import { disconnectPrisma } from "../infrastructure/db/postgres/prismaClient.js";

/**
 * worker専用エントリポイント(docs/adr/0008-worker-container-separation.md)。
 * apiと同一イメージ・別プロセスとして起動する(package.json start:worker参照)。
 *
 * 以降のフェーズで以下をここに追加していく:
 *   - 会議録パーサー/正規化 (Phase1c以降)
 *   - 通知ディスパッチ      (Phase4)
 */
cron.schedule("*/30 * * * *", () => {
  void runJob("heartbeat", async () => {
    return 0;
  });
});

// 議案スクレイピング(Phase1)。市長提出議案ページの更新頻度は低いため1日1回で十分。
cron.schedule("0 18 * * *", () => {
  void runJob("scrape-bills", scrapeBillsJob);
});

// 会期予定表の取り込み(Phase1b)。議案スクレイピングの後に実行し、Meeting行を更新する。
cron.schedule("30 18 * * *", () => {
  void runJob("scrape-session-schedule", scrapeSessionScheduleJob);
});

// 議員・会派の取り込み(Phase2)。更新頻度は低いため1日1回で十分。
cron.schedule("0 19 * * *", () => {
  void runJob("scrape-legislators", scrapeLegislatorsJob);
});

// 議案審議結果の同期(docs/adr/0016)。議案スクレイピング・会期予定表取り込みの後に実行する。
cron.schedule("15 19 * * *", () => {
  void runJob("sync-bill-deliberation-results", syncBillDeliberationResultsJob);
});

// 議案表決態度の同期(docs/adr/0017)。議案の取り込み後に実行する。
cron.schedule("20 19 * * *", () => {
  void runJob("sync-bill-votes", syncBillVotesJob);
});

// AIコンテンツ生成(Phase3)。スクレイピング完了後、1日1回・少数ずつ処理する。
cron.schedule("0 20 * * *", () => {
  void runJob("generate-ai-content", generateAiContentJob);
});

// eslint-disable-next-line no-console
console.log("worker started");

async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`received ${signal}, shutting down`);
  await disconnectPrisma();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
