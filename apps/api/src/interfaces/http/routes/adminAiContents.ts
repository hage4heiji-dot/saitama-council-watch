import { VerifyAiContentInputSchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { HttpError } from "../middleware/errorHandler.js";
import { requireAdminToken } from "../middleware/requireAdminToken.js";

/**
 * 管理確認画面向けinternal API(Phase3、docs/adr/0007)。
 * 公開読み取り系(/api/v1)とは別に配線し、requireAdminTokenで保護する
 * (docs/design/01-basic-design.md §4「内部/管理系(外部非公開)」)。
 */
export const adminAiContentsRouter = Router();
adminAiContentsRouter.use(requireAdminToken);

const aiContentRepository = new PrismaAiContentRepository(prisma);
const billRepository = new PrismaBillRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);

adminAiContentsRouter.get("/internal/ai-contents/pending", async (_req, res, next) => {
  try {
    const pending = await aiContentRepository.findPendingVerification(50);

    const items = [];
    for (const aiContent of pending) {
      const [bill, document] = await Promise.all([
        billRepository.findBySourceDocumentId(aiContent.sourceDocumentId),
        documentRepository.findById(aiContent.sourceDocumentId),
      ]);
      if (!bill || !document) {
        continue; // 整合性が崩れている場合はスキップ(一覧取得自体は失敗させない)
      }
      items.push({
        aiContent,
        billNumber: bill.billNumber,
        billTitle: bill.title,
        sourceUrl: document.sourceUrl,
      });
    }

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

adminAiContentsRouter.post("/internal/ai-contents/:id/verify", async (req, res, next) => {
  try {
    const body = VerifyAiContentInputSchema.parse(req.body);
    const updated = await aiContentRepository.markVerified(req.params.id ?? "", body.verifiedBy);
    if (!updated) {
      throw new HttpError(404, "AiContent not found");
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});
