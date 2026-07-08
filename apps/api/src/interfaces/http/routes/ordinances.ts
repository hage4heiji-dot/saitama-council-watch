import type { OrdinanceBill } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { attachSourceUrlToMany } from "../../../application/bills/attachSourceUrl.js";
import { classifyOrdinanceBillKind } from "../../../domain/ordinance/ordinanceBillClassification.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";

export const ordinancesRouter = Router();
const billRepository = new PrismaBillRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);

/**
 * 条例一覧(docs/adr/0025)。新規スクレイパー・専用テーブルは使わず、既存の
 * 議案(Bill)からタイトルに「条例」を含むものを取得し、種別(制定/改正/廃止)で
 * 分類して返す。小規模データのためページネーションは行わない(YAGNI)。
 */
ordinancesRouter.get("/ordinances", async (_req, res, next) => {
  try {
    const candidates = await billRepository.findByTitleContaining("条例");
    const classified = candidates
      .map((bill) => ({ bill, kind: classifyOrdinanceBillKind(bill.title) }))
      .filter((entry) => entry.kind !== null);

    const withSource = await attachSourceUrlToMany(
      classified.map((entry) => entry.bill),
      documentRepository,
    );
    const items: OrdinanceBill[] = withSource
      .map((bill, index) => ({ ...bill, kind: classified[index]!.kind! }))
      .sort((a, b) => (b.submittedDate ?? "").localeCompare(a.submittedDate ?? ""));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});
