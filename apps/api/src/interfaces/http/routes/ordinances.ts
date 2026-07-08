import type { OrdinanceBill } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { attachSourceUrlToMany } from "../../../application/bills/attachSourceUrl.js";
import { classifyOrdinanceBillKind } from "../../../domain/ordinance/ordinanceBillClassification.js";
import { tallyVotesByBillId } from "../../../domain/vote/voteTally.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaBillRepository } from "../../../infrastructure/db/postgres/repositories/PrismaBillRepository.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaVoteRepository } from "../../../infrastructure/db/postgres/repositories/PrismaVoteRepository.js";

export const ordinancesRouter = Router();
const billRepository = new PrismaBillRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);
const voteRepository = new PrismaVoteRepository(prisma);

/**
 * 条例一覧(docs/adr/0025)。新規スクレイパー・専用テーブルは使わず、既存の
 * 議案(Bill)からタイトルに「条例」を含むものを取得し、種別(制定/改正/廃止)で
 * 分類して返す。小規模データのためページネーションは行わない(YAGNI)。
 *
 * 可決/否決だけでは会派間の賛否の分かれ方が見えないため、表決態度データが
 * 取れている議案には賛否の内訳(voteTally)を併記する。
 */
ordinancesRouter.get("/ordinances", async (_req, res, next) => {
  try {
    const candidates = await billRepository.findByTitleContaining("条例");
    const classified = candidates
      .map((bill) => ({ bill, kind: classifyOrdinanceBillKind(bill.title) }))
      .filter((entry) => entry.kind !== null);

    const [withSource, allVotes] = await Promise.all([
      attachSourceUrlToMany(
        classified.map((entry) => entry.bill),
        documentRepository,
      ),
      voteRepository.findAllWithBillInfo(),
    ]);
    const tallies = tallyVotesByBillId(allVotes);

    const items: OrdinanceBill[] = withSource
      .map((bill, index) => ({
        ...bill,
        kind: classified[index]!.kind!,
        voteTally: tallies.get(bill.id) ?? null,
      }))
      .sort((a, b) => (b.submittedDate ?? "").localeCompare(a.submittedDate ?? ""));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});
