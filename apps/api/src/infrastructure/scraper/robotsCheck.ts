import { politeFetch } from "./httpClient.js";

/**
 * robots.txtの「User-agent: *」グループのDisallowだけを抽出する。
 * 他ボット向け(例: GPTBot)の個別Disallowを取り違えて誤ってブロックしないよう、
 * User-agentのグループ分けを踏まえて解析する
 * (discusscabinet.netの実robots.txtが「User-agent: GPTBot / Disallow: /」のみを
 *  持つことを確認済み。グループを無視すると無関係のボット向け禁止規則で
 *  誤って自分たちのアクセスまで禁止と判定してしまう)。
 */
function extractWildcardDisallowedPaths(body: string): string[] {
  const disallowed: string[] = [];
  let appliesToUs = false;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim();
    const userAgentMatch = /^user-agent:\s*(.*)$/i.exec(line);
    if (userAgentMatch) {
      appliesToUs = (userAgentMatch[1]?.trim() ?? "") === "*";
      continue;
    }

    const disallowMatch = /^disallow:\s*(.*)$/i.exec(line);
    if (disallowMatch && appliesToUs) {
      const path = disallowMatch[1]?.trim() ?? "";
      if (path.length > 0) {
        disallowed.push(path);
      }
    }
  }

  return disallowed;
}

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

  const disallowedPaths = extractWildcardDisallowedPaths(body);
  const isDisallowed = disallowedPaths.some((path) => targetPath.startsWith(path));
  if (isDisallowed) {
    throw new Error(`robots.txtにより ${targetPath} へのアクセスが禁止されています`);
  }
}
