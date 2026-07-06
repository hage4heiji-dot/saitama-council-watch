import { SNIPPET_HIGHLIGHT_END, SNIPPET_HIGHLIGHT_START } from "@saitama-council-watch/shared-types";
import { Fragment } from "react";

/**
 * 検索結果のsnippetを安全に描画する。APIはHTMLタグではなく制御文字で
 * ハイライト範囲を示すため、dangerouslySetInnerHTMLを使わずに済む
 * (apps/api/src/infrastructure/db/sqlite/SqliteSearchRepository.ts参照)。
 */
export function HighlightedSnippet({ snippet }: { snippet: string }) {
  const parts = snippet.split(SNIPPET_HIGHLIGHT_START);

  return (
    <>
      {parts.map((part, index) => {
        if (index === 0) {
          return <Fragment key={index}>{part}</Fragment>;
        }
        const [highlighted, ...rest] = part.split(SNIPPET_HIGHLIGHT_END);
        return (
          <Fragment key={index}>
            <mark>{highlighted}</mark>
            {rest.join(SNIPPET_HIGHLIGHT_END)}
          </Fragment>
        );
      })}
    </>
  );
}
