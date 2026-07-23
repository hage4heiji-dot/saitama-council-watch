import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaCouncilTermRepository } from "../../../infrastructure/db/postgres/repositories/PrismaCouncilTermRepository.js";

export const councilTermsRouter = Router();
const councilTermRepository = new PrismaCouncilTermRepository(prisma);

/**
 * 議員任期履歴一覧(docs/adr/0027)。年月×人物のマトリクス表示はフロントエンド側で
 * 組み立てる(区・氏名でのグルーピングは表示上の関心事のため、APIはフラットな一覧のみ返す)。
 * 小規模データ(2003〜2023年、約370件)のためページネーションは行わない(YAGNI)。
 */
councilTermsRouter.get("/council-terms", async (_req, res, next) => {
  try {
    const items = await councilTermRepository.findAll();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
