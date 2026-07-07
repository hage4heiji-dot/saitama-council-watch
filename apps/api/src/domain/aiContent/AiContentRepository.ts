import type { AiContent, AiContentType } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 * source_document_idはNOT NULL(schema.prisma)であり、原本のないAI生成は
 * DB制約レベルで禁止される(docs/design/00-constitution.md)。
 */
export interface CreateAiContentInput {
  sourceDocumentId: string;
  contentType: AiContentType;
  body: string;
  modelVersion: string;
  promptVersion: string;
  groundingNote?: string | undefined;
}

export interface AiContentRepository {
  create(input: CreateAiContentInput): Promise<AiContent>;
  findById(id: string): Promise<AiContent | null>;
  findBySourceDocumentId(sourceDocumentId: string): Promise<AiContent[]>;
  /** 人手確認ゲート(docs/adr/0007)で未確認のものを一覧する */
  findPendingVerification(limit: number): Promise<AiContent[]>;
  markVerified(id: string, verifiedBy: string): Promise<AiContent | null>;
  /** 承認済み(isVerified=true)のコンテンツのみを種別で取得する。ホーム画面のタグ集計等で使う */
  findVerifiedByContentType(contentType: AiContentType): Promise<AiContent[]>;
}
