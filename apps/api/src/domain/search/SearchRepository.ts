/**
 * ポート(interface)。全文検索はSQLite(技術的キャッシュ)側の実装
 * (infrastructure/db/sqlite)に閉じ込める(docs/adr/0006-ai-content-storage-split.md)。
 * インデックスは常にPostgresから再構築可能なキャッシュであり、業務データそのものではない。
 */
export interface SearchResultItem {
  refId: string;
  snippet: string;
}

export interface SearchRepository {
  indexContent(refId: string, content: string): void;
  search(query: string, limit: number): SearchResultItem[];
}
