import { resolve } from "node:path";
import { ingestExpenditureBudget } from "../../application/ingestExpenditureBudget/IngestExpenditureBudgetUseCase.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBillRepository } from "../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaBudgetRepository } from "../../infrastructure/db/postgres/repositories/PrismaBudgetRepository.js";
import { PrismaDocumentRepository } from "../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { runJob } from "../runJob.js";

/**
 * 予算議案(既に取り込み済みのBill/Document)から歳出の款別内訳を解析し、
 * Budgetへ反映するジョブ(docs/adr/0024)。新規スクレイピングは行わないため、
 * 議案スクレイピング(scrape-bills)の後であればいつ実行してもよい。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api ingest:expenditure-budget` で単体実行できる。
 */
export async function ingestExpenditureBudgetJob(): Promise<number> {
  const result = await ingestExpenditureBudget({
    billRepository: new PrismaBillRepository(prisma),
    documentRepository: new PrismaDocumentRepository(prisma),
    budgetRepository: new PrismaBudgetRepository(prisma),
    rawStorageRoot: resolve(process.cwd(), env.RAW_STORAGE_PATH),
  });

  console.warn(
    `ingest-expenditure-budget: billsProcessed=${result.billsProcessed} categoriesUpserted=${result.categoriesUpserted}`,
  );
  return result.categoriesUpserted;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("ingest-expenditure-budget", ingestExpenditureBudgetJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
