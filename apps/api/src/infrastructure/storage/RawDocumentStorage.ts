import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DocumentType } from "@saitama-council-watch/shared-types";

const EXTENSION_BY_TYPE: Record<DocumentType, string> = {
  pdf: "pdf",
  html: "html",
  markdown: "md",
  json: "json",
};

export interface SavedRawDocument {
  storagePath: string;
  checksum: string;
}

/**
 * 原本(PDF/HTML/Markdown/JSON)をdata/raw配下に保存する。
 * 改変・上書きをしないよう、パスはchecksum(sha256)を含めて決定的に導出する。
 * docs/design/00-constitution.md「AIは必ず原本を参照できる構造にする」を満たす基盤。
 */
export function saveRawDocument(
  rawRoot: string,
  type: DocumentType,
  content: Buffer,
): SavedRawDocument {
  const checksum = createHash("sha256").update(content).digest("hex");
  const relativePath = `${type}/${checksum}.${EXTENSION_BY_TYPE[type]}`;
  const absolutePath = resolve(rawRoot, relativePath);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);

  return { storagePath: relativePath, checksum };
}
