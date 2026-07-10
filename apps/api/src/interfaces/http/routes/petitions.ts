import { Router } from "express";
import { attachSourceUrlToPetitions } from "../../../application/petitions/attachSourceUrl.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaPetitionRepository } from "../../../infrastructure/db/postgres/repositories/PrismaPetitionRepository.js";

export const petitionsRouter = Router();
const petitionRepository = new PrismaPetitionRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);

/**
 * 請願一覧(docs/adr/0026)。小規模データのためページネーションは行わない(YAGNI)。
 */
petitionsRouter.get("/petitions", async (_req, res, next) => {
  try {
    const petitions = await petitionRepository.findAll();
    const items = await attachSourceUrlToPetitions(petitions, documentRepository);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
