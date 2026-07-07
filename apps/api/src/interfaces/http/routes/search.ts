import { SearchQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { attachSourceUrl } from "../../../application/bills/attachSourceUrl.js";
import { buildSourceDocumentTagsMap } from "../../../domain/aiContent/billTags.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { sqlite } from "../../../infrastructure/db/sqlite/sqliteClient.js";
import { SqliteSearchRepository } from "../../../infrastructure/db/sqlite/SqliteSearchRepository.js";

/**
 * 議案の全文検索(Phase2、SQLite FTS5 trigram、docs/adr/0006)。
 * 現時点では議案タイトル・議案番号・会期名のみを対象とする(PDF本文抽出は未対応)。
 * tagが指定された場合は、キーワード検索結果をさらにタグで絞り込む(AND条件)。
 */
export const searchRouter = Router();
const billRepository = new PrismaBillRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);
const aiContentRepository = new PrismaAiContentRepository(prisma);
const searchRepository = new SqliteSearchRepository(sqlite);

searchRouter.get("/search", async (req, res, next) => {
  try {
    const query = SearchQuerySchema.parse(req.query);
    const hits = searchRepository.search(query.q, query.limit);

    const bills = await billRepository.findManyByIds(hits.map((hit) => hit.refId));
    const billById = new Map(bills.map((bill) => [bill.id, bill]));

    const tagContents = await aiContentRepository.findVerifiedByContentType("tags");
    const tagsBySourceDocumentId = buildSourceDocumentTagsMap(tagContents);

    const results = [];
    for (const hit of hits) {
      const bill = billById.get(hit.refId);
      if (!bill) {
        continue; // 検索インデックスとPostgresがズレている場合はスキップ(整合性エラーにしない)
      }
      const tags = tagsBySourceDocumentId.get(bill.sourceDocumentId) ?? [];
      if (query.tag && !tags.includes(query.tag)) {
        continue;
      }
      results.push({
        bill: await attachSourceUrl(bill, documentRepository, tagsBySourceDocumentId),
        snippet: hit.snippet,
      });
    }

    res.json({ query: query.q, results });
  } catch (error) {
    next(error);
  }
});
