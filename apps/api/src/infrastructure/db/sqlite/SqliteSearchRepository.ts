import { SNIPPET_HIGHLIGHT_END, SNIPPET_HIGHLIGHT_START } from "@saitama-council-watch/shared-types";
import type Database from "better-sqlite3";
import { buildManualSnippet } from "../../../domain/search/buildManualSnippet.js";
import type { SearchRepository, SearchResultItem } from "../../../domain/search/SearchRepository.js";

/**
 * search_indexのtrigramトークナイザは、Unicodeコードポイント数で3文字未満の
 * クエリを1つもトークン化できず、MATCHが常に0件になる(実データで確認済み:
 * 「市税」「条例」等の2文字キーワードが、本文に含まれているにもかかわらず
 * 1件もヒットしなかった)。このため、この文字数未満のクエリはLIKE検索に
 * フォールバックする。
 */
const MIN_TRIGRAM_QUERY_LENGTH = 3;

/** FTS5のフレーズクエリとして安全に扱えるよう、二重引用符でエスケープして囲む */
function toPhraseQuery(query: string): string {
  const escaped = query.replace(/"/g, '""');
  return `"${escaped}"`;
}

/** LIKEパターン中の特殊文字(%, _, エスケープ文字自体)をエスケープする */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export class SqliteSearchRepository implements SearchRepository {
  constructor(private readonly db: Database.Database) {}

  indexContent(refId: string, content: string): void {
    this.db.prepare("DELETE FROM search_index WHERE ref_id = ?").run(refId);
    this.db.prepare("INSERT INTO search_index (ref_id, content) VALUES (?, ?)").run(refId, content);
  }

  search(query: string, limit: number): SearchResultItem[] {
    if ([...query].length < MIN_TRIGRAM_QUERY_LENGTH) {
      return this.searchByLike(query, limit);
    }

    const rows = this.db
      .prepare(
        `SELECT ref_id AS refId, snippet(search_index, 1, ?, ?, '...', 16) AS snippet
         FROM search_index
         WHERE search_index MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(SNIPPET_HIGHLIGHT_START, SNIPPET_HIGHLIGHT_END, toPhraseQuery(query), limit) as SearchResultItem[];
    return rows;
  }

  private searchByLike(query: string, limit: number): SearchResultItem[] {
    const rows = this.db
      .prepare(`SELECT ref_id AS refId, content FROM search_index WHERE content LIKE ? ESCAPE '\\' LIMIT ?`)
      .all(`%${escapeLikePattern(query)}%`, limit) as { refId: string; content: string }[];

    return rows.map((row) => ({
      refId: row.refId,
      snippet: buildManualSnippet(row.content, query),
    }));
  }
}
