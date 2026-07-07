import type { AiContent, TagCount } from "@saitama-council-watch/shared-types";
import { buildSourceDocumentTagsMap } from "./billTags.js";

/**
 * 承認済み(isVerified=true)のタグAiContentから、タグ別の件数を集計する(ホーム画面向け)。
 * タグの解決自体はbuildSourceDocumentTagsMap(billTags.ts)に委譲し、集計のみ行う。
 */
export function aggregateTagCounts(tagContents: AiContent[]): TagCount[] {
  const counts = new Map<string, number>();

  for (const tags of buildSourceDocumentTagsMap(tagContents).values()) {
    for (const tag of tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"));
}
