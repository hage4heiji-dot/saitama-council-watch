import { toFullWidthDigits, type Era } from "./eraDate.js";
import { DiscussCabinetSession } from "./discussCabinetClient.js";

/**
 * さいたま市議会資料検索システム(Discuss Cabinet)から、指定した会期(本会議)の
 * 「委員会審査結果報告一覧」「議案審議結果一覧」PDFを取得する(docs/adr/0016)。
 *
 * 2026-07-07時点のフォルダ構成(本会議 > 令和8年 > 6月定例会 > 日付フォルダ/審議結果)に基づく。
 */

const PLENARY_CABINET_ID = "1";
const RESULT_DOCUMENT_TITLE_PATTERN = /審[議査]結果/;

export interface DeliberationSourceDocument {
  /** 例: "令和８年６月定例会議案審議結果一覧" */
  title: string;
  pdfBuffer: Buffer;
  /**
   * Discuss Cabinetはフォーム遷移のみでGETの安定URLを持たないため、
   * docidを埋め込んだ疑似URLを原本の識別子として用いる(直接fetchはできない)。
   */
  sourceUrl: string;
  /**
   * 委員会審査結果報告一覧("...委員会..."を含む)か、専決処分等の議案審議結果一覧かで
   * PDF内のテーブル書式(議案番号の表記)が異なるため、パーサーへ渡す形式を判定しておく
   * (domain/bill/deliberationResult.ts)。
   */
  format: "committee_report" | "session_summary";
}

export interface DeliberationResultQuery {
  era: Era;
  eraYear: number;
  month: number;
  sessionKind: "定例会" | "臨時会";
}

export async function fetchDeliberationResultDocuments(
  query: DeliberationResultQuery,
): Promise<DeliberationSourceDocument[]> {
  const session = new DiscussCabinetSession();
  await session.enterGuest();
  await session.selectCabinet(PLENARY_CABINET_ID);

  const yearTitle = `${query.era}${toFullWidthDigits(query.eraYear)}年`;
  const yearFolderId = session.findFolderByTitle(yearTitle);
  if (!yearFolderId) {
    throw new Error(`資料検索システムに「${yearTitle}」フォルダが見つかりません`);
  }
  await session.enterFolder(yearFolderId);

  const sessionTitle = `${toFullWidthDigits(query.month)}月${query.sessionKind}`;
  const sessionFolderId = session.findFolderByTitle(sessionTitle);
  if (!sessionFolderId) {
    throw new Error(`資料検索システムに「${sessionTitle}」フォルダが見つかりません`);
  }
  await session.enterFolder(sessionFolderId);

  const subfolders = session.listSubfolders();

  const documents: DeliberationSourceDocument[] = [];
  for (const sub of subfolders) {
    await session.enterFolder(sub.folderId);
    const docs = session.listDocuments().filter((doc) => RESULT_DOCUMENT_TITLE_PATTERN.test(doc.title));

    for (const [index, doc] of docs.entries()) {
      if (index > 0) {
        // 同一フォルダ内の2件目以降は、文書詳細画面から一度フォルダ一覧へ戻ってから開き直す
        await session.exitFolder(sub.folderId);
        await session.enterFolder(sub.folderId);
      }
      const fileId = await session.viewDocument(doc.docid);
      if (!fileId) {
        continue;
      }
      const pdfBuffer = await session.downloadFile(fileId);
      documents.push({
        title: doc.title,
        pdfBuffer,
        sourceUrl: `https://www.discusscabinet.net/saitama/doc_view/${doc.docid}`,
        format: doc.title.includes("委員会") ? "committee_report" : "session_summary",
      });
    }

    await session.exitFolder(sub.folderId);
  }

  return documents;
}
