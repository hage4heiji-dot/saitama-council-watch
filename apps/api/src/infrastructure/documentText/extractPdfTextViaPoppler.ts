import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * 選挙結果PDF(市発行、eDocument Library製)は、pdf-parse(内蔵pdfjsが古い)では
 * フォントのグリフを解決できず本文が空文字列になることを実機検証で確認した
 * (docs/adr/0027)。poppler-utilsの`pdftotext`は同じPDFを正しく解読できるため、
 * このPDF種別に限りこちらを使う。
 *
 * `-layout`オプションで元の表の列位置をできる限り空白で再現させる。単純な
 * 改行結合(pdf-parseの既定動作)では列がバラバラの順序で出てしまう表形式PDFのため、
 * 列位置を保った出力が前提となる(budgetTableParsing.tsが
 * X/Y座標のクラスタリングで解決しているのと同じ問題への、pdftotext版の対処)。
 */
export async function extractPdfTextViaPoppler(buffer: Buffer): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "council-term-pdf-"));
  const pdfPath = join(dir, "input.pdf");
  const txtPath = join(dir, "output.txt");
  try {
    await writeFile(pdfPath, buffer);
    await execFileAsync("pdftotext", ["-layout", pdfPath, txtPath]);
    const text = await readFile(txtPath, "utf-8");
    return text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
