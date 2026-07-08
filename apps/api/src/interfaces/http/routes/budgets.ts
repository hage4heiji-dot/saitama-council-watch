import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBudgetRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBudgetRepository.js";

export const budgetsRouter = Router();
const budgetRepository = new PrismaBudgetRepository(prisma);

/**
 * 予算画面向け(docs/adr/0024)。年度セレクタ用にデータのある会計年度の一覧を返す。
 */
budgetsRouter.get("/budgets/fiscal-years", async (_req, res, next) => {
  try {
    const items = await budgetRepository.findDistinctFiscalYears();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

/**
 * 指定した会計年度の歳出内訳(款別)を全会計分返す。小規模データのためページネーションは
 * 行わない(議員一覧・年間マイルストーンと同じ判断、YAGNI)。
 */
budgetsRouter.get("/budgets", async (req, res, next) => {
  try {
    const fiscalYearParam = req.query.fiscalYear;
    const fiscalYear = typeof fiscalYearParam === "string" ? Number(fiscalYearParam) : NaN;
    if (!Number.isInteger(fiscalYear)) {
      res.status(400).json({ error: "fiscalYear is required and must be an integer" });
      return;
    }
    const items = await budgetRepository.findByFiscalYear(fiscalYear);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});
