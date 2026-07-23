import { resolve } from "node:path";
import type { CouncilTermElectionConfig } from "../../application/ingestCouncilTerms/IngestCouncilTermsUseCase.js";
import { ingestCouncilTerms } from "../../application/ingestCouncilTerms/IngestCouncilTermsUseCase.js";
import { env } from "../../config/env.js";
import { prisma } from "../../infrastructure/db/postgres/prismaClient.js";
import { PrismaCouncilTermRepository } from "../../infrastructure/db/postgres/repositories/PrismaCouncilTermRepository.js";
import { PrismaDocumentRepository } from "../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaLegislatorRepository } from "../../infrastructure/db/postgres/repositories/PrismaLegislatorRepository.js";
import { runJob } from "../runJob.js";

/**
 * 過去の市議会議員選挙結果(docs/adr/0027)の一度きりのバックフィルジョブ。
 * 確定済みの過去選挙は結果が変わらないため、cronスケジュール(src/batch/runner.ts)には
 * 登録しない。`npm run --workspace apps/api ingest:council-terms`で手動実行する。
 *
 * PR1(このコミット時点)では実データでの解析を検証済みの2003年(平成15年)のみを対象とする。
 * 残り5回の選挙(2007/2011/2015/2019/2023)は別PRで追加する(docs/adr/0027)。
 */
const ELECTIONS: CouncilTermElectionConfig[] = [
  {
    query: { era: "平成", eraYear: 15, indexPagePath: "/006/009/kakonosenkyokekka/p018209.html" },
    electionDate: "2003-04-13",
    electionKind: "regular",
  },
];

export async function ingestCouncilTermsJob(): Promise<number> {
  const result = await ingestCouncilTerms(
    {
      documentRepository: new PrismaDocumentRepository(prisma),
      councilTermRepository: new PrismaCouncilTermRepository(prisma),
      legislatorRepository: new PrismaLegislatorRepository(prisma),
      rawStorageRoot: resolve(process.cwd(), env.RAW_STORAGE_PATH),
    },
    ELECTIONS,
  );

  console.warn(
    `ingest-council-terms: electionsProcessed=${result.electionsProcessed} termsUpserted=${result.termsUpserted} documentsCreated=${result.documentsCreated}`,
  );
  return result.termsUpserted;
}

const isDirectExecution = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isDirectExecution) {
  runJob("ingest-council-terms", ingestCouncilTermsJob)
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exitCode = 1;
    });
}
