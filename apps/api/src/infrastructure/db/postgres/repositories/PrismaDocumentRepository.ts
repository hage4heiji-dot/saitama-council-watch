import type { Document as PrismaDocument, DocumentType as PrismaDocumentType } from "@prisma/client";
import type { Document, DocumentType } from "@saitama-council-watch/shared-types";
import type { PrismaClient } from "@prisma/client";
import type { CreateDocumentInput, DocumentRepository } from "../../../../domain/document/DocumentRepository.js";

const PRISMA_TO_SHARED_TYPE: Record<PrismaDocumentType, DocumentType> = {
  PDF: "pdf",
  HTML: "html",
  MARKDOWN: "markdown",
  JSON: "json",
};

const SHARED_TO_PRISMA_TYPE: Record<DocumentType, PrismaDocumentType> = {
  pdf: "PDF",
  html: "HTML",
  markdown: "MARKDOWN",
  json: "JSON",
};

function toDomain(row: PrismaDocument): Document {
  return {
    id: row.id,
    type: PRISMA_TO_SHARED_TYPE[row.type],
    sourceUrl: row.sourceUrl,
    storagePath: row.storagePath,
    checksum: row.checksum,
    version: row.version,
    fetchedAt: row.fetchedAt.toISOString(),
  };
}

export class PrismaDocumentRepository implements DocumentRepository {
  constructor(private readonly client: PrismaClient) {}

  async findLatestBySourceUrl(sourceUrl: string): Promise<Document | null> {
    const row = await this.client.document.findFirst({
      where: { sourceUrl },
      orderBy: { version: "desc" },
    });
    return row ? toDomain(row) : null;
  }

  async create(input: CreateDocumentInput): Promise<Document> {
    const latest = await this.findLatestBySourceUrl(input.sourceUrl);
    const nextVersion = latest ? latest.version + 1 : 1;

    const row = await this.client.document.create({
      data: {
        type: SHARED_TO_PRISMA_TYPE[input.type],
        sourceUrl: input.sourceUrl,
        storagePath: input.storagePath,
        checksum: input.checksum,
        version: nextVersion,
        fetchedAt: input.fetchedAt,
      },
    });
    return toDomain(row);
  }

  async findById(id: string): Promise<Document | null> {
    const row = await this.client.document.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }
}
