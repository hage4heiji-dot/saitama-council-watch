import type {
  AiContent as PrismaAiContent,
  AiContentType as PrismaAiContentType,
  PrismaClient,
} from "@prisma/client";
import type { AiContent, AiContentType } from "@saitama-council-watch/shared-types";
import type {
  AiContentRepository,
  CreateAiContentInput,
} from "../../../../domain/aiContent/AiContentRepository.js";

const PRISMA_TO_SHARED_TYPE: Record<PrismaAiContentType, AiContentType> = {
  SUMMARY: "summary",
  TAGS: "tags",
  FAQ: "faq",
  RELATED_INFO: "related_info",
};

const SHARED_TO_PRISMA_TYPE: Record<AiContentType, PrismaAiContentType> = {
  summary: "SUMMARY",
  tags: "TAGS",
  faq: "FAQ",
  related_info: "RELATED_INFO",
};

function toDomain(row: PrismaAiContent): AiContent {
  return {
    id: row.id,
    sourceDocumentId: row.sourceDocumentId,
    contentType: PRISMA_TO_SHARED_TYPE[row.contentType],
    body: row.body,
    modelVersion: row.modelVersion,
    promptVersion: row.promptVersion,
    generatedAt: row.generatedAt.toISOString(),
    isVerified: row.isVerified,
    verifiedBy: row.verifiedBy,
    verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
    groundingNote: row.groundingNote,
  };
}

export class PrismaAiContentRepository implements AiContentRepository {
  constructor(private readonly client: PrismaClient) {}

  async create(input: CreateAiContentInput): Promise<AiContent> {
    const row = await this.client.aiContent.create({
      data: {
        sourceDocumentId: input.sourceDocumentId,
        contentType: SHARED_TO_PRISMA_TYPE[input.contentType],
        body: input.body,
        modelVersion: input.modelVersion,
        promptVersion: input.promptVersion,
        generatedAt: new Date(),
        ...(input.groundingNote ? { groundingNote: input.groundingNote } : {}),
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<AiContent | null> {
    const row = await this.client.aiContent.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findBySourceDocumentId(sourceDocumentId: string): Promise<AiContent[]> {
    const rows = await this.client.aiContent.findMany({ where: { sourceDocumentId } });
    return rows.map(toDomain);
  }

  async findPendingVerification(limit: number): Promise<AiContent[]> {
    const rows = await this.client.aiContent.findMany({
      where: { isVerified: false },
      orderBy: [{ groundingNote: { sort: "desc", nulls: "last" } }, { generatedAt: "asc" }],
      take: limit,
    });
    return rows.map(toDomain);
  }

  async markVerified(id: string, verifiedBy: string): Promise<AiContent | null> {
    const existing = await this.client.aiContent.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const row = await this.client.aiContent.update({
      where: { id },
      data: { isVerified: true, verifiedBy, verifiedAt: new Date() },
    });
    return toDomain(row);
  }
}
