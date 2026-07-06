import cron from "node-cron";
import { scrapeBillsJob } from "./jobs/scrapeBills.js";
import { scrapeLegislatorsJob } from "./jobs/scrapeLegislators.js";
import { scrapeSessionScheduleJob } from "./jobs/scrapeSessionSchedule.js";
import { runJob } from "./runJob.js";
import { disconnectPrisma } from "../infrastructure/db/postgres/prismaClient.js";

/**
 * worker専用エントリポイント(docs/adr/0008-worker-container-separation.md)。
 * apiと同一イメージ・別プロセスとして起動する(package.json start:worker参照)。
 *
 * 以降のフェーズで以下をここに追加していく:
 *   - 会議録パーサー/正規化 (Phase1c以降)
 *   - AIパイプライン        (Phase3, docs/design/01-basic-design.md §6)
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
