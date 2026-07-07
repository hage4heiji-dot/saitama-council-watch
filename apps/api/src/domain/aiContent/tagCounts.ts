import type { AiContent, TagCount } from "@saitama-council-watch/shared-types";

/**
 * 承認済み(isVerified=true)のタグAiContentから、タグ別の件数を集計する(ホーム画面向け)。
 * タグは`AiContent.body`にJSON配列文字列として保存されている(GenerateAiContentUseCase参照)。
 * 想定外の形式(パース失敗)の行は捏造を避けて無視する。
 */
export function aggregateTagCounts(tagContents: AiContent[]): TagCount[] {
  const counts = new Map<string, number>();

  for (const content of tagContents) {
    let tags: unknown;
    try {
      tags = JSON.parse(content.body);
    } catch {
      continue;
    }
    if (!Array.isArray(tags)) {
      continue;
    }
    for (const tag of tags) {
      if (typeof tag !== "string" || tag.length === 0) {
        continue;
      }
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "ja"));
}
