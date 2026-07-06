import { resolve } from "node:path";
import { generateAiContent } from "../../application/generateAiContent/GenerateAiContentUseCase.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaBillRepository } from "../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { LlmResponseCache } from "../../infrastructure/db/sqlite/LlmResponseCache.js";
import { sqlite } from "../../infrastructure/db/sqlite/sqliteClient.js";
import { ClaudeBillAnalysisAdapter } from "../../infrastructure/ai/ClaudeBillAnalysisAdapter.js";
import { runJob } from "../runJob.js";

/**
 * AIコンテンツ生成ジョブ(Phase3)。
 * worker cron(src/batch/runner.ts)から呼ばれるほか、
 * `npm run --workspace apps/api generate:ai-content` で単体実行できる。
 */
export async function generateAiContentJob(): Promise<number> {
  const result = await generateAiContent(
    {
      billRepository: new PrismaBillRepository(prisma),
      documentRepository: new PrismaDocumentRepository(prisma),
      aiContentRepository: new PrismaAiContentRepository(prisma),
      billAnalysisPort: new ClaudeBillAnalysisAdapter(new LlmResponseCache(sqlite)),
      rawStorageRoot: resolve(process.cwd(), env.RAW_STORAGE_PATH),
    },
    { limit: env.GENERATE_AI_CONTENT_LIMIT },
  );

  console.warn(
    `generate-ai-content: processed=${result.processed} flaggedForReview=${result.flaggedForReview} skipped=${result.skipped}`,
  );
  return result.processed;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("generate-ai-content", generateAiContentJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
