import { LegislatorListQuerySchema } from "@saitama-council-watch/shared-types";
import { Router } from "express";
import { buildLegislatorDetail } from "../../../application/legislators/buildLegislatorDetail.js";
import { buildSourceDocumentTagsMap } from "../../../domain/aiContent/billTags.js";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { PrismaAiContentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaAiContentRepository.js";
import { PrismaDocumentRepository } from "../../../infrastructure/db/postgres/repositories/PrismaDocumentRepository.js";
import { PrismaLegislatorRepository } from "../../../infrastructure/db/postgres/repositories/PrismaLegislatorRepository.js";
import { PrismaVoteRepository } from "../../../infrastructure/db/postgres/repositories/PrismaVoteRepository.js";
import { HttpError } from "../middleware/errorHandler.js";

/**
 * 議員一覧・詳細。定数60議席と規模が小さく増減もほぼないため、
 * ページネーションは行わない(bills/meetingsとは異なる判断、YAGNI)。
 * includeInactive=trueで元議員(is_active=false)も含める(docs/adr/0020)。
 */
export const legislatorsRouter = Router();
const legislatorRepository = new PrismaLegislatorRepository(prisma);
const documentRepository = new PrismaDocumentRepository(prisma);
const aiContentRepository = new PrismaAiContentRepository(prisma);
const voteRepository = new PrismaVoteRepository(prisma);

legislatorsRouter.get("/legislators", async (req, res, next) => {
  try {
    const query = LegislatorListQuerySchema.parse(req.query);
    const items = await legislatorRepository.findAll({ includeInactive: query.includeInactive });
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

legislatorsRouter.get("/legislators/:id", async (req, res, next) => {
  try {
    const legislator = await legislatorRepository.findById(req.params.id ?? "");
    if (!legislator) {
      throw new HttpError(404, "Legislator not found");
    }
    const [factionHistory, votes, tagContents] = await Promise.all([
      legislatorRepository.findFactionHistory(legislator.id),
      voteRepository.findByLegislatorId(legislator.id),
      aiContentRepository.findVerifiedByContentType("tags"),
    ]);
    const tagsBySourceDocumentId = buildSourceDocumentTagsMap(tagContents);
    const detail = await buildLegislatorDetail(
      legislator,
      factionHistory,
      votes,
      documentRepository,
      tagsBySourceDocumentId,
    );
    res.json(detail);
  } catch (error) {
    next(error);
  }
});
