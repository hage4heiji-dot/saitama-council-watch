import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaLegislatorRepository } from "../../../infrastructure/db/postgres/repositories/PrismaLegislatorRepository.js";

/**
 * 議員一覧(現職のみ)。定数60議席と規模が小さく増減もほぼないため、
 * ページネーションは行わない(bills/meetingsとは異なる判断、YAGNI)。
 */
export const legislatorsRouter = Router();
const legislatorRepository = new PrismaLegislatorRepository(prisma);

legislatorsRouter.get("/legislators", async (_req, res, next) => {
  try {
    const items = await legislatorRepository.findAll();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
