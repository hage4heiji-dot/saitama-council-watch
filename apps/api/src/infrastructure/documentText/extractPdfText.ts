import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pdfParse from "pdf-parse";

/**
 * 原本PDFからテキストを抽出する(Phase3、AIへの入力として使用)。
 * ここで抽出した本文以外の情報をAIに与えない(docs/design/00-constitution.md)。
 */
export async function extractPdfText(rawStorageRoot: string, storagePath: string): Promise<string> {
  const absolutePath = resolve(rawStorageRoot, storagePath);
  const buffer = await readFile(absolutePath);
  const parsed = await pdfParse(buffer);
  return parsed.text.trim();
}
