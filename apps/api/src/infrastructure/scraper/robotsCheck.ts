import { politeFetch } from "./httpClient.js";

/**
 * robots.txtが対象パスを明示的に禁止していないかを確認する。
 * 2026-07-06時点でさいたま市公式サイトにrobots.txtは存在しない(404)ことを確認済みだが、
 * 5年以上の運用の中でサイト側が追加する可能性に備えて毎回チェックする
 * (docs/adr/0002-data-ingestion-scraping.md)。
 */
export async function assertAllowedByRobotsTxt(origin: string, targetPath: string): Promise<void> {
  let body: string;
  try {
    const resource = await politeFetch(`${origin}/robots.txt`);
    body = resource.buffer.toString("utf-8");
  } catch {
    // robots.txtが存在しない(404等)場合はクロール許可とみなす
    return;
  }

  const disallowedPaths = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("disallow:"))
    .map((line) => line.slice("disallow:".length).trim())
    .filter((path) => path.length > 0);

  const isDisallowed = disallowedPaths.some((path) => targetPath.startsWith(path));
  if (isDisallowed) {
    throw new Error(`robots.txtにより ${targetPath} へのアクセスが禁止されています`);
  }
}
