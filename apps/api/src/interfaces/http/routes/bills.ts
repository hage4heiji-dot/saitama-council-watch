import { BillListQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { attachSourceUrlToMany } from "../../../application/bills/attachSourceUrl.js";
import { buildBillDetail } from "../../../application/bills/buildBillDetail.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaVoteRepository } from "../../../infrastructure/db/postgres/repositories/PrismaVoteRepository.js";
import { HttpError } from "../middleware/errorHandler.js";

export const billsRouter = Router();
const billRepository = new PrismaBillRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);
const aiContentRepository = new PrismaAiContentRepository(prisma);
const voteRepository = new PrismaVoteRepository(prisma);

billsRouter.get("/bills", async (req, res, next) => {
  try {
    const query = BillListQuerySchema.parse(req.query);
    const page = await billRepository.findPage(query);
    const items = await attachSourceUrlToMany(page.items, documentRepository);
    res.json({ items, nextCursor: page.nextCursor });
  } catch (error) {
    next(error);
  }
});

billsRouter.get("/bills/:id", async (req, res, next) => {
  try {
    const [bill] = await billRepository.findManyByIds([req.params.id ?? ""]);
    if (!bill) {
      throw new HttpError(404, "Bill not found");
    }
    const detail = await buildBillDetail(bill, documentRepository, aiContentRepository);
    res.json(detail);
  } catch (error) {
    next(error);
  }
});

billsRouter.get("/bills/:id/votes", async (req, res, next) => {
  try {
    const [bill] = await billRepository.findManyByIds([req.params.id ?? ""]);
    if (!bill) {
      throw new HttpError(404, "Bill not found");
    }
    const items = await voteRepository.findByBillId(bill.id);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
