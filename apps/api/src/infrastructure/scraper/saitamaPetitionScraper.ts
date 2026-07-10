import { toFullWidthDigits, type Era } from "./eraDate.js";
import { DiscussCabinetSession } from "./discussCabinetClient.js";

/**
 * さいたま市議会資料検索システム(Discuss Cabinet)から、指定した会期(本会議)の
 * 「請願文書表」(請願ごとの全文)・「請願審議結果一覧」(審議結果)を取得する(docs/adr/0026)。
 *
 * 「請願文書表」は同一会期内で複数回(追加送付分「（その２）」等)に分かれて
 * 各日付フォルダに配布されることがあるため、日付フォルダ・審議結果フォルダを問わず
 * 会期フォルダ配下の全サブフォルダを走査し、タイトルパターンで対象文書を集める
 * (docs/adr/0016のsaitamaDeliberationResultsScraper.tsと同じ方針)。
 */

const PLENARY_CABINET_ID = "1";
// 実データでは「03_R080204請願文書表」のように日付・連番の接頭辞が付く
const DETAIL_DOCUMENT_TITLE_PATTERN = /請願文書表/;
const RESULT_DOCUMENT_TITLE_PATTERN = /請願審議結果一覧/;

export interface PetitionSourceDocument {
  title: string;
  pdfBuffer: Buffer;
  /** Discuss Cabinetはフォーム遷移のみのためdocidを埋め込んだ疑似URLを原本の識別子として使う */
  sourceUrl: string;
}

export interface PetitionQuery {
  era: Era;
  eraYear: number;
  month: number;
  sessionKind: "定例会" | "臨時会";
}

export interface PetitionSourceDocuments {
  /** 請願文書表(件名・請願者・紹介議員・要旨等の全文) */
  detailDocuments: PetitionSourceDocument[];
  /** 請願審議結果一覧(審議結果・議決日) */
  resultDocument: PetitionSourceDocument | null;
}

async function downloadDocument(
  session: DiscussCabinetSession,
  docid: string,
  title: string,
): Promise<PetitionSourceDocument | null> {
  const fileId = await session.viewDocument(docid);
  if (!fileId) {
    return null;
  }
  const pdfBuffer = await session.downloadFile(fileId);
  return {
    title,
    pdfBuffer,
    sourceUrl: `https://www.discusscabinet.net/saitama/doc_view/${docid}`,
  };
}

export async function fetchPetitionDocuments(query: PetitionQuery): Promise<PetitionSourceDocuments> {
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

  const detailDocuments: PetitionSourceDocument[] = [];
  let resultDocument: PetitionSourceDocument | null = null;

  for (const sub of subfolders) {
    await session.enterFolder(sub.folderId);
    const docs = session.listDocuments();

    const detailDocs = docs.filter((doc) => DETAIL_DOCUMENT_TITLE_PATTERN.test(doc.title));
    const resultDocs = docs.filter((doc) => RESULT_DOCUMENT_TITLE_PATTERN.test(doc.title));

    for (const [index, doc] of [...detailDocs, ...resultDocs].entries()) {
      if (index > 0) {
        // 同一フォルダ内の2件目以降は、文書詳細画面から一度フォルダ一覧へ戻ってから開き直す
        await session.exitFolder(sub.folderId);
        await session.enterFolder(sub.folderId);
      }
      const document = await downloadDocument(session, doc.docid, doc.title);
      if (!document) {
        continue;
      }
      if (DETAIL_DOCUMENT_TITLE_PATTERN.test(doc.title)) {
        detailDocuments.push(document);
      } else {
        resultDocument = document;
      }
    }

    await session.exitFolder(sub.folderId);
  }

  return { detailDocuments, resultDocument };
}
