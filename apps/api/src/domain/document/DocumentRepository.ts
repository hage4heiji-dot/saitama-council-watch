import type { Document, DocumentType } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く。
 * ドメイン層・アプリケーション層はこのinterfaceにのみ依存し、Prismaを直接知らない
 * (docs/adr/0001-architecture-style.md)。
 */
export interface CreateDocumentInput {
  type: DocumentType;
  sourceUrl: string;
  storagePath: string;
  checksum: string;
  fetchedAt: Date;
}

export interface DocumentRepository {
  findLatestBySourceUrl(sourceUrl: string): Promise<Document | null>;
  create(input: CreateDocumentInput): Promise<Document>;
  findById(id: string): Promise<Document | null>;
}
