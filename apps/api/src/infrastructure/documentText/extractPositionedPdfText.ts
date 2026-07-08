import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pdfParse from "pdf-parse";

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

interface PdfJsTextItem {
  str: string;
  transform: number[];
}

interface PdfJsPage {
  getTextContent(options?: {
    normalizeWhitespace?: boolean;
    disableCombineTextItems?: boolean;
  }): Promise<{ items: PdfJsTextItem[] }>;
}

/**
 * pdf-parseの既定のテキスト結合(改行のみ)では失われる、各テキスト片のX/Y座標を
 * 保持したまま抽出する。表決態度PDFのような「列位置が意味を持つ」表形式の原本を
 * 解析するために使用する(docs/adr/0017 議案表決態度の取り込み)。
 */
export async function extractPositionedPdfText(buffer: Buffer): Promise<PositionedTextItem[]> {
  const items: PositionedTextItem[] = [];
  let currentPage = 0;

  await pdfParse(buffer, {
    pagerender: async (pageData: PdfJsPage) => {
      currentPage += 1;
      const textContent = await pageData.getTextContent({
        normalizeWhitespace: false,
        disableCombineTextItems: true,
      });
      for (const item of textContent.items) {
        items.push({
          str: item.str,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
          page: currentPage,
        });
      }
      return "";
    },
  });

  return items;
}

/** ディスク保存済みのPDF原本から座標付きテキストを抽出する版(docs/adr/0024 予算款別内訳) */
export async function extractStoredPositionedPdfText(
  rawStorageRoot: string,
  storagePath: string,
): Promise<PositionedTextItem[]> {
  const absolutePath = resolve(rawStorageRoot, storagePath);
  const buffer = await readFile(absolutePath);
  return extractPositionedPdfText(buffer);
}
