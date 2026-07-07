import type { AiContent } from "@saitama-council-watch/shared-types";

/**
 * 承認済み(is_verified=true)のタグAiContentから、sourceDocumentId→タグ配列の
 * マップを組み立てる(docs/adr/0007)。議案一覧・検索結果・議案詳細のいずれも
 * このマップを共通で使い、タグの解決ロジックを1箇所に集約する。
 *
 * タグは`AiContent.body`にJSON配列文字列として保存されている
 * (GenerateAiContentUseCase参照)。想定外の形式(パース失敗)の行は
 * 捏造を避けて無視する。
 */
export function buildSourceDocumentTagsMap(tagContents: AiContent[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const content of tagContents) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content.body);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) {
      continue;
    }
    const tags = parsed.filter((tag): tag is string => typeof tag === "string" && tag.length > 0);
    map.set(content.sourceDocumentId, tags);
  }
  return map;
}

/** 指定したタグを含む議案のsourceDocumentId一覧を返す(議案一覧・検索のタグ絞り込み向け) */
export function sourceDocumentIdsForTag(tagContents: AiContent[], tag: string): string[] {
  const map = buildSourceDocumentTagsMap(tagContents);
  return [...map.entries()]
    .filter(([, tags]) => tags.includes(tag))
    .map(([sourceDocumentId]) => sourceDocumentId);
}
