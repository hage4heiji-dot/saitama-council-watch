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
 * 2003年(合併後初の統一地方選挙)〜2023年までの全6回の統一地方選挙を対象とする(PR2)。
 * 2027年の次回統一地方選挙が実施されたら、この配列に新しい選挙を追記して再実行する。
 * 既知の補欠選挙(2013年見沼区、2009年西区・北区、2005年浦和区・岩槻区、2004年南区)は
 * 別のPDFで公開されているが、今回はスコープ外とする(将来の課題、docs/adr/0027)。
 * 2015年の北区はこのPDFに掲載がない(無投票当選等の理由と推測。捏造せず未収録のままにする)。
 */
const ELECTIONS: CouncilTermElectionConfig[] = [
  {
    query: { era: "平成", eraYear: 15, indexPagePath: "/006/009/kakonosenkyokekka/p018209.html" },
    electionDate: "2003-04-13",
    electionKind: "regular",
  },
  {
    query: { era: "平成", eraYear: 19, indexPagePath: "/006/009/kakonosenkyokekka/p018209.html" },
    electionDate: "2007-04-08",
    electionKind: "regular",
  },
  {
    query: { era: "平成", eraYear: 23, indexPagePath: "/006/009/kakonosenkyokekka/p018209.html" },
    electionDate: "2011-04-10",
    electionKind: "regular",
  },
  {
    query: { era: "平成", eraYear: 27, indexPagePath: "/006/009/kakonosenkyokekka/p047821.html" },
    electionDate: "2015-04-12",
    electionKind: "regular",
  },
  {
    query: { era: "平成", eraYear: 31, indexPagePath: "/006/009/kakonosenkyokekka/p047821.html" },
    electionDate: "2019-04-07",
    electionKind: "regular",
  },
  {
    query: { era: "令和", eraYear: 5, indexPagePath: "/006/009/kakonosenkyokekka/p096964.html" },
    electionDate: "2023-04-09",
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
