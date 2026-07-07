import { LegislatorTagMatrixQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { buildSourceDocumentTagsMap } from "../../../domain/aiContent/billTags.js";
import { buildLegislatorTagMatrix } from "../../../domain/vote/legislatorTagMatrix.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaVoteRepository } from "../../../infrastructure/db/postgres/repositories/PrismaVoteRepository.js";

export const analysisRouter = Router();
const aiContentRepository = new PrismaAiContentRepository(prisma);
const voteRepository = new PrismaVoteRepository(prisma);

/**
 * 議員×タグのクロス集計(docs/adr/0019)。承認済みタグと投票記録のANDが取れる
 * 議案のみが対象になる(タグ未承認・投票未取り込みの議案は捏造を避けて除外)。
 */
analysisRouter.get("/cross-tab/legislator-tags", async (req, res, next) => {
  try {
    const query = LegislatorTagMatrixQuerySchema.parse(req.query);
    const [votes, tagContents] = await Promise.all([
      voteRepository.findAllWithBillInfo(),
      aiContentRepository.findVerifiedByContentType("tags"),
    ]);
    const tagsBySourceDocumentId = buildSourceDocumentTagsMap(tagContents);
    const matrix = buildLegislatorTagMatrix(votes, tagsBySourceDocumentId, query.status, query.meetingId);
    res.json(matrix);
  } catch (error) {
    next(error);
  }
});
