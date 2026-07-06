import { CursorPageQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaMeetingRepository } from "../../../infrastructure/db/postgres/repositories/PrismaMeetingRepository.js";
import { HttpError } from "../middleware/errorHandler.js";

export const meetingsRouter = Router();
const meetingRepository = new PrismaMeetingRepository(prisma);

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
