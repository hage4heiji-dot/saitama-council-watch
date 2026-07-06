import { SNIPPET_HIGHLIGHT_END, SNIPPET_HIGHLIGHT_START } from "@saitama-council-watch/shared-types";
import type Database from "better-sqlite3";
import type { SearchRepository, SearchResultItem } from "../../../domain/search/SearchRepository.js";

/** FTS5のフレーズクエリとして安全に扱えるよう、二重引用符でエスケープして囲む */
function toPhraseQuery(query: string): string {
  const escaped = query.replace(/"/g, '""');
  return `"${escaped}"`;
}

export class SqliteSearchRepository implements SearchRepository {
  constructor(private readonly db: Database.Database) {}

  indexContent(refId: string, content: string): void {
    this.db.prepare("DELETE FROM search_index WHERE ref_id = ?").run(refId);
    this.db.prepare("INSERT INTO search_index (ref_id, content) VALUES (?, ?)").run(refId, content);
  }

  search(query: string, limit: number): SearchResultItem[] {
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
}
