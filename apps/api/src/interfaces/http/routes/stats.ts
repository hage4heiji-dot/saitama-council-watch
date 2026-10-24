import { Router } from "express";
import { buildSourceDocumentTagsMap } from "../../../domain/aiContent/billTags.js";
import { buildTopicStats } from "../../../domain/aiContent/topicStats.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaMeetingRepository } from "../../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { PrismaPetitionRepository } from "../../../infrastructure/db/postgres/repositories/PrismaPetitionRepository.js";

export const statsRouter = Router();
const aiContentRepository = new PrismaAiContentRepository(prisma);
const billRepository = new PrismaBillRepository(prisma);
const meetingRepository = new PrismaMeetingRepository(prisma);
const petitionRepository = new PrismaPetitionRepository(prisma);

/**
 * 統計ページ(議題トピック分析、docs/adr/0029)。承認済みタグのみを対象に、
 * 手続き語の除外・表記ゆれのまとめを行った政策トピックの件数を返す。
 */
statsRouter.get("/stats/topics", async (_req, res, next) => {
  try {
    const [meetings, tagContents, petitions] = await Promise.all([
      meetingRepository.findAll(),
      aiContentRepository.findVerifiedByContentType("tags"),
      petitionRepository.findAll(),
    ]);
    const sessions = await Promise.all(
      meetings.map(async (meeting) => ({ meeting, bills: await billRepository.findAllByMeetingId(meeting.id) })),
    );
    res.json(buildTopicStats(sessions, buildSourceDocumentTagsMap(tagContents), petitions));
  } catch (error) {
    next(error);
  }
});
