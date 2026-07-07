import { SNIPPET_HIGHLIGHT_END, SNIPPET_HIGHLIGHT_START } from "@saitama-council-watch/shared-types";

const CONTEXT_CHARS = 20;

/**
 * SQLite FTS5のtrigramトークナイザは3文字未満のクエリを一切トークン化できず、
 * MATCHが常に0件になる(実データで確認済み: 「市税」「条例」等の2文字の
 * キーワードが、本文に含まれているにもかかわらず1件もヒットしなかった)。
 * このため短いクエリはLIKE検索にフォールバックする必要があり、その際は
 * snippet()関数(FTS専用)が使えないため、同じ制御文字マーカーを使って
 * 手動でスニペットを組み立てる(SqliteSearchRepository参照)。
 */
export function buildManualSnippet(content: string, query: string): string {
  const index = content.indexOf(query);
  if (index === -1) {
    // 通常発生しない(LIKE '%query%'でヒットした行のはず)が、念のため全文を返す
    return content;
  }

  const start = Math.max(0, index - CONTEXT_CHARS);
  const end = Math.min(content.length, index + query.length + CONTEXT_CHARS);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";

  return (
    prefix +
    content.slice(start, index) +
    SNIPPET_HIGHLIGHT_START +
    content.slice(index, index + query.length) +
    SNIPPET_HIGHLIGHT_END +
    content.slice(index + query.length, end) +
    suffix
  );
}
