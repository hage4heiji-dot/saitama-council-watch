import cron from "node-cron";
import { runJob } from "./runJob.js";
import { disconnectPrisma } from "../infrastructure/db/postgres/prismaClient.js";

/**
 * worker専用エントリポイント(docs/adr/0008-worker-container-separation.md)。
 * apiと同一イメージ・別プロセスとして起動する(package.json start:worker参照)。
 *
 * 現時点ではジョブ実行基盤の疎通確認としてheartbeatのみ登録する。
 * 以降のフェーズで以下をここに追加していく:
 *   - スクレイパー         (Phase1, docs/adr/0002)
 *   - パーサー/正規化       (Phase1)
 *   - AIパイプライン        (Phase3, docs/design/01-basic-design.md §6)
 *   - 通知ディスパッチ      (Phase4)
 */
cron.schedule("*/30 * * * *", () => {
  void runJob("heartbeat", async () => {
    return 0;
  });
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
