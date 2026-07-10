import { setTimeout as sleep } from "node:timers/promises";
import { env } from "../../config/env.js";

export interface FetchedResource {
  buffer: Buffer;
  contentType: string | null;
}

let lastRequestAt = 0;

/**
 * 同一プロセス内での連続リクエスト間隔を強制する(politeness delay)。
 * さいたま市議会サイトへの負荷配慮(docs/adr/0002-data-ingestion-scraping.md)。
 */
async function waitForPoliteInterval(): Promise<void> {
  const elapsedMs = Date.now() - lastRequestAt;
  const remainingMs = env.SCRAPER_REQUEST_DELAY_MS - elapsedMs;
  if (remainingMs > 0) {
    await sleep(remainingMs);
  }
}

// 一時的なサーバーエラー(実データで確認済み: 同一URLへの再取得で200になるケースがある)。
// 恒久的なエラー(404等)は即座に投げ、無関係なリトライで相手サイトへ負荷をかけない。
const TRANSIENT_STATUS_CODES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 3000;

export async function politeFetch(url: string): Promise<FetchedResource> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await waitForPoliteInterval();
    lastRequestAt = Date.now();

    const response = await fetch(url, {
      headers: { "User-Agent": env.SCRAPER_USER_AGENT },
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        contentType: response.headers.get("content-type"),
      };
    }

    const isLastAttempt = attempt === MAX_ATTEMPTS;
    if (!TRANSIENT_STATUS_CODES.has(response.status) || isLastAttempt) {
      throw new Error(`スクレイピング先の応答がエラーでした: ${response.status} ${url}`);
    }
    await sleep(RETRY_BACKOFF_MS * attempt);
  }
  throw new Error(`スクレイピング先の応答がエラーでした(到達しないはずの分岐): ${url}`);
}

export interface FormPostResult extends FetchedResource {
  /** レスポンスのSet-Cookie(次リクエストへそのまま引き継ぐ用、単純な単一Cookie転送) */
  setCookie: string | null;
}

/**
 * フォームPOST(x-www-form-urlencoded)+Cookie転送に対応した版。
 * さいたま市議会資料検索システム(Discuss Cabinet)のようなセッション・フォーム遷移型の
 * サイトに対応するため(docs/adr/0016-bill-deliberation-status-sync.md)。
 */
export async function politePostForm(
  url: string,
  fields: Record<string, string>,
  cookie: string | null,
): Promise<FormPostResult> {
  await waitForPoliteInterval();
  lastRequestAt = Date.now();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": env.SCRAPER_USER_AGENT,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(fields).toString(),
  });

  if (!response.ok) {
    throw new Error(`スクレイピング先の応答がエラーでした: ${response.status} ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const setCookieHeader = response.headers.get("set-cookie");
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type"),
    setCookie: setCookieHeader ? (setCookieHeader.split(";")[0] ?? null) : null,
  };
}
