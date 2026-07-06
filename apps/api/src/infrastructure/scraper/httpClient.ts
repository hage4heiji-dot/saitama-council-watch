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

export async function politeFetch(url: string): Promise<FetchedResource> {
  await waitForPoliteInterval();
  lastRequestAt = Date.now();

  const response = await fetch(url, {
    headers: { "User-Agent": env.SCRAPER_USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`スクレイピング先の応答がエラーでした: ${response.status} ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: response.headers.get("content-type"),
  };
}
