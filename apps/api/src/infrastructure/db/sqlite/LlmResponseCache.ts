import { createHash } from "node:crypto";
import type Database from "better-sqlite3";

/**
 * LLM応答キャッシュ(docs/design/01-basic-design.md §6.4)。
 * 同一原本テキスト・同一プロンプト版への再呼び出しを防ぎコストを抑える。
 * SQLite側は再生成可能な技術的キャッシュに過ぎない(docs/adr/0006)。
 */
export interface CachedLlmResponse {
  responseJson: string;
  modelVersion: string;
  promptVersion: string;
}

export function contentHashFor(promptVersion: string, sourceText: string): string {
  return createHash("sha256").update(`${promptVersion}:${sourceText}`).digest("hex");
}

export class LlmResponseCache {
  constructor(private readonly db: Database.Database) {}

  get(contentHash: string): CachedLlmResponse | null {
    const row = this.db
      .prepare(
        `SELECT response_json AS responseJson, model_version AS modelVersion, prompt_version AS promptVersion
         FROM llm_response_cache WHERE content_hash = ?`,
      )
      .get(contentHash) as CachedLlmResponse | undefined;
    return row ?? null;
  }

  set(contentHash: string, promptVersion: string, modelVersion: string, responseJson: string): void {
    this.db
      .prepare(
        `INSERT INTO llm_response_cache (content_hash, prompt_version, model_version, response_json)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(content_hash) DO UPDATE SET
           response_json = excluded.response_json,
           model_version = excluded.model_version,
           prompt_version = excluded.prompt_version`,
      )
      .run(contentHash, promptVersion, modelVersion, responseJson);
  }
}
