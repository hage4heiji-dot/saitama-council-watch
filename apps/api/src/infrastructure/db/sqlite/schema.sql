-- SQLite(AI専用・技術的キャッシュ層)スキーマ
-- docs/adr/0006-ai-content-storage-split.md の決定に基づき、
-- ここには「Postgres + 原本ファイルから再生成可能」なデータのみを置く。業務データは置かない。
-- PrismaはFTS5/vector拡張をネイティブサポートしないため、このDBはbetter-sqlite3で直接操作する。

-- LLM応答キャッシュ: 同一原本テキストへの再呼び出しを防ぎコストを抑える(docs/design/01-basic-design.md §6.4)
CREATE TABLE IF NOT EXISTS llm_response_cache (
  content_hash   TEXT PRIMARY KEY, -- 原本テキストのsha256
  prompt_version TEXT NOT NULL,
  model_version  TEXT NOT NULL,
  response_json  TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 埋め込みベクトル: 関連議案・関連条例の検索に使用(docs/design/01-basic-design.md §6.3)
-- Phase0ではJSON文字列で保持。データ量増加時はsqlite-vec拡張への移行、
-- さらに増加した場合はpgvector移行パスを取る(docs/adr/0006参照)。
CREATE TABLE IF NOT EXISTS embeddings (
  document_id  TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  vector_json  TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (document_id, chunk_index)
);

-- 全文検索インデックス(Postgres本文のミラー)
CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
  document_id UNINDEXED,
  content
);
