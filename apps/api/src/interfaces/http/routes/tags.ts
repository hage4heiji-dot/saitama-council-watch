import { Router } from "express";
import { aggregateTagCounts } from "../../../domain/aiContent/tagCounts.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";

export const tagsRouter = Router();
const aiContentRepository = new PrismaAiContentRepository(prisma);

/** ホーム画面のタグ別件数表示向け(承認済みのタグのみ集計、docs/adr/0007) */
tagsRouter.get("/tags", async (_req, res, next) => {
  try {
    const verifiedTagContents = await aiContentRepository.findVerifiedByContentType("tags");
    const items = aggregateTagCounts(verifiedTagContents);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
