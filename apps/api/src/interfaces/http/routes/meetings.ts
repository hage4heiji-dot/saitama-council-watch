import { CursorPageQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaCommitteeMeetingRepository } from "../../../infrastructure/db/postgres/repositories/PrismaCommitteeMeetingRepository.js";
import { PrismaMeetingRepository } from "../../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { HttpError } from "../middleware/errorHandler.js";

export const meetingsRouter = Router();
const meetingRepository = new PrismaMeetingRepository(prisma);
const committeeMeetingRepository = new PrismaCommitteeMeetingRepository(prisma);

meetingsRouter.get("/meetings", async (req, res, next) => {
  try {
    const query = CursorPageQuerySchema.parse(req.query);
    const page = await meetingRepository.findPage(query);
    res.json(page);
  } catch (error) {
    next(error);
  }
});

meetingsRouter.get("/meetings/:id", async (req, res, next) => {
  try {
    const meeting = await meetingRepository.findById(req.params.id ?? "");
    if (!meeting) {
      throw new HttpError(404, "Meeting not found");
    }
    res.json(meeting);
  } catch (error) {
    next(error);
  }
});

/**
 * 年間マイルストーン画面向け(docs/adr/0023)。本会議・委員会単位の個別日程を全件返す。
 * 小規模データのためページネーションは行わない(議員一覧と同じ判断、YAGNI)。
 */
meetingsRouter.get("/committee-meetings", async (_req, res, next) => {
  try {
    const items = await committeeMeetingRepository.findAll();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
