import { TagCountsQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { aggregateTagCounts } from "../../../domain/aiContent/tagCounts.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";

export const tagsRouter = Router();
const aiContentRepository = new PrismaAiContentRepository(prisma);
const billRepository = new PrismaBillRepository(prisma);

/**
 * タグ別件数表示向け(承認済みのタグのみ集計、docs/adr/0007)。
 * meetingIdを指定すると、その会期の議案のタグのみに絞って集計する(docs/adr/0018、
 * ホーム画面は最新会期のみを表示するため)。
 */
tagsRouter.get("/tags", async (req, res, next) => {
  try {
    const query = TagCountsQuerySchema.parse(req.query);
    const verifiedTagContents = await aiContentRepository.findVerifiedByContentType("tags");

    let targetContents = verifiedTagContents;
    if (query.meetingId) {
      const bills = await billRepository.findAllByMeetingId(query.meetingId);
      const sourceDocumentIds = new Set(bills.map((bill) => bill.sourceDocumentId));
      targetContents = verifiedTagContents.filter((content) => sourceDocumentIds.has(content.sourceDocumentId));
    }

    const items = aggregateTagCounts(targetContents);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
