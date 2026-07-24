import { clusterByX, nearestCluster } from "../shared/xClustering.js";

/**
 * 予算議案PDF(当初予算・補正予算)の「第１表 歳入歳出予算(補正)」表を解析する
 * (歳出/docs/adr/0024、歳入/docs/adr/0028)。同じ表内に歳入(款/項)と歳出(款/項)の
 * 両方が含まれ、構造が共通するため、見出し文字列と終端の合計行の文言だけを差し替えて
 * 同じロジックで解析する。
 *
 * pdf-parseの既定のテキスト結合では表の列位置が失われるため、
 * 表決態度PDFの解析(docs/adr/0017, voteStanceParsing.ts)と同様に
 * X/Y座標付きのテキスト抽出(extractPositionedPdfText)を前提とする。
 *
 * 表の構造(実データで確認済み):
 *   - 「　歳　出」「　歳　入」という見出し(全角スペース区切り)がそれぞれの表の開始位置。
 *   - 見出し直後に「款/項/金額」(当初予算)または「款/項/補正前の額/補正額/計」(補正予算)
 *     というヘッダー行がある。
 *   - 各行は先頭に款(1〜2桁)または項(1〜2桁)の番号があり、款のX座標は項より小さい
 *     (款・項の2種類の左端X座標クラスタに分かれる)。
 *   - 金額は右揃えで、桁数に応じて2つ以上のテキスト片に分割される(例:
 *     「316,158,00」+「3」で「316,158,003」)。同じ行内でX座標が近い片同士を連結する。
 *   - 補正予算は金額列が3つ(補正前の額/補正額/計)あるが、款ごとの最新の金額を知りたい
 *     ので一番右の「計」列(補正後の金額)を採用する。
 *   - 表の最終行は「歳出合計」「歳入合計」という総計行(款ではない)。この行で表の終わりとみなす。
 *
 * 隠れた前提(docs/adr/0028): 見出し以降のアイテムは終端側を区切らずに返す
 * (itemsAfterHeading)。歳出表は文書内最後の表のため無害だが、歳入表を解析する際は
 * 見出し以降の残りに後続の歳出表も含まれる。現状は(a)findHeaderRowが文書順で最初の
 * ヘッダー行を返すこと、(b)同一議案内の歳入表・歳出表が常に同じ列数であることの2点で
 * 正しく動作している。歳入・歳出で列数が食い違う議案が現れた場合は破綻しうるため、
 * 回帰テスト(歳入結果に歳出カテゴリ名が混入しないこと)で検知する。
 */

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

export interface BudgetSubItem {
  name: string;
  /** 円単位(原本は千円単位のため1000倍して保持する) */
  amountYen: number;
}

export interface BudgetCategory {
  /** 款番号(例: "1") */
  categoryNumber: string;
  /** 款名(例: "総務費") */
  categoryName: string;
  /** 円単位(原本は千円単位のため1000倍して保持する) */
  amountYen: number;
  /** 項単位の内訳(原本の表記そのまま。捏造しない) */
  subItems: BudgetSubItem[];
}

const LEADING_NUMBER_PATTERN = /^\d{1,2}$/;
const AMOUNT_FRAGMENT_PATTERN = /^[0-9,]+$/;
const ROW_Y_TOLERANCE = 2;
/** 列(款/項の左端、金額の列)を区切るためのX座標クラスタリングの間隔閾値 */
const COLUMN_GAP_THRESHOLD = 30;

function stripAllWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

interface Row {
  page: number;
  y: number;
  items: PositionedTextItem[]; // x昇順
}

/**
 * PDFは空セルの位置合わせのため空白のみの項目(セルのプレースホルダ)を差し込むことがあり、
 * これが実データで隣接する行のY座標に近いことがあるため、行のグルーピングを乱す前に除外する。
 */
function isBlank(item: PositionedTextItem): boolean {
  return item.str.trim() === "";
}

function groupIntoRows(items: PositionedTextItem[]): Row[] {
  const sorted = items
    .filter((item) => !isBlank(item))
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const item of sorted) {
    const last = rows[rows.length - 1];
    if (last && last.page === item.page && Math.abs(last.y - item.y) <= ROW_Y_TOLERANCE) {
      last.items.push(item);
      last.items.sort((a, b) => a.x - b.x);
    } else {
      rows.push({ page: item.page, y: item.y, items: [item] });
    }
  }
  return rows;
}

/**
 * 表の開始位置(見出し)より後ろの項目のみを、文書順(ページ→Y降順)で返す。
 * 見出しが見つからない場合はnull(表なし。捏造しない)。
 */
function itemsAfterHeading(items: PositionedTextItem[], headingText: string): PositionedTextItem[] | null {
  // 見出しの空白の入り方には揺れがある(実データ: 「　歳　出」(先頭にも空白)と
  // 「歳　出」(先頭なし)の両方を確認)。地の文中の詰まった見出しと区別するため、
  // 空白除去後に見出し文言と一致し、かつ元の文字列に空白を含むものを見出しとみなす。
  const heading = items.find(
    (item) => stripAllWhitespace(item.str) === headingText && item.str !== headingText,
  );
  if (!heading) {
    return null;
  }
  return items.filter(
    (item) => item.page > heading.page || (item.page === heading.page && item.y < heading.y),
  );
}

/** 行の先頭項目が款・項番号(1〜2桁の数字のみ)かどうか */
function leadingNumberOf(row: Row): string | null {
  const first = row.items[0];
  if (!first) {
    return null;
  }
  const trimmed = first.str.trim();
  return LEADING_NUMBER_PATTERN.test(trimmed) ? trimmed : null;
}

/** 行内の金額らしき項目(数字・カンマのみ)と、それ以外(名称)の項目を分ける */
function splitNameAndAmountItems(rowItemsAfterLeadingNumber: PositionedTextItem[]): {
  nameItems: PositionedTextItem[];
  amountItems: PositionedTextItem[];
} {
  const firstAmountIndex = rowItemsAfterLeadingNumber.findIndex((item) =>
    AMOUNT_FRAGMENT_PATTERN.test(item.str.trim()),
  );
  if (firstAmountIndex === -1) {
    return { nameItems: rowItemsAfterLeadingNumber, amountItems: [] };
  }
  return {
    nameItems: rowItemsAfterLeadingNumber.slice(0, firstAmountIndex),
    amountItems: rowItemsAfterLeadingNumber.slice(firstAmountIndex),
  };
}

function assembleName(nameItems: PositionedTextItem[]): string {
  return stripAllWhitespace(nameItems.map((item) => item.str).join(""));
}

/** ヘッダーに「補正前の額」の文言があれば補正予算(3列: 補正前の額/補正額/計)、なければ当初予算(1列: 金額) */
function detectAmountColumnCount(items: PositionedTextItem[]): 1 | 3 {
  return items.some((item) => item.str.includes("補正前")) ? 3 : 1;
}

/** ヘッダー行(「款」「項」が単独の項目として現れる行)を探す */
function findHeaderRow(rows: Row[]): Row | null {
  return (
    rows.find(
      (row) => row.items.some((item) => item.str.trim() === "款") && row.items.some((item) => item.str.trim() === "項"),
    ) ?? null
  );
}

/**
 * 金額列が複数ある場合(補正予算の「補正前の額/補正額/計」)に、一番右の列(最新の金額)
 * との境界となるX座標を、ヘッダー行自体の項目位置から求める。
 *
 * データ行の金額から列境界を推定する方式(ギャップ検出・出現頻度)は、款が1つしか
 * ない小規模な議案(実データ: 国民健康保険事業特別会計補正予算)では手がかりが
 * 少なすぎて誤検出することが分かった。ヘッダー行の位置はデータ行数に関わらず
 * 常に1回だけ存在するため、この問題が起きない。「計」ヘッダーのX座標と、その
 * 直前(左)にあるヘッダー項目(「補正額」ラベルの末尾。複数テキスト片に分かれても
 * 文言に依存せずX座標だけで判定する)のX座標の中点を境界とする。
 */
function findRightmostColumnThreshold(headerRow: Row | null, columnCount: 1 | 3): number {
  if (columnCount === 1 || !headerRow) {
    return -Infinity;
  }
  const totalColumnHeaderX = headerRow.items.find((item) => item.str.trim() === "計")?.x;
  if (totalColumnHeaderX === undefined) {
    return -Infinity;
  }
  const precedingHeaderXs = headerRow.items
    .map((item) => item.x)
    .filter((x) => x < totalColumnHeaderX);
  if (precedingHeaderXs.length === 0) {
    return -Infinity;
  }
  return (Math.max(...precedingHeaderXs) + totalColumnHeaderX) / 2;
}

function parseAmountYen(items: PositionedTextItem[]): number | null {
  if (items.length === 0) {
    return null;
  }
  const digitsText = [...items]
    .sort((a, b) => a.x - b.x)
    .map((item) => item.str)
    .join("")
    .replace(/,/g, "")
    .trim();
  if (!/^\d+$/.test(digitsText)) {
    return null;
  }
  // 原本は千円単位
  return Number(digitsText) * 1000;
}

function parseBudgetTable(
  items: PositionedTextItem[],
  headingText: string,
  totalRowPrefix: string,
): BudgetCategory[] {
  const tableItems = itemsAfterHeading(items, headingText);
  if (!tableItems) {
    return [];
  }

  const allRows = groupIntoRows(tableItems);

  // 総計行(「歳出合計」「歳入合計」)を境界として、それより後ろ(もう一方の表や
  // 第２表以降の別表)は対象の款とは無関係なので取り込まない。総計行の先頭項目は
  // 数字ではないため、後段の款・項フィルタでは検出できず、別途探す必要がある。
  const totalRowIndex = allRows.findIndex((row) =>
    stripAllWhitespace(row.items.map((item) => item.str).join("")).startsWith(totalRowPrefix),
  );
  const rows = totalRowIndex === -1 ? allRows : allRows.slice(0, totalRowIndex);

  const candidateRows = rows
    .map((row) => ({ row, leadingNumber: leadingNumberOf(row) }))
    .filter((entry): entry is { row: Row; leadingNumber: string } => entry.leadingNumber !== null);

  if (candidateRows.length === 0) {
    return [];
  }

  // 款(小さいX)/項(大きいX)の2クラスタに分ける
  const leadingClusters = clusterByX(
    candidateRows.map((entry) => entry.row.items[0]!.x),
    COLUMN_GAP_THRESHOLD,
  );
  const categoryLevelX = Math.min(...leadingClusters);

  // 金額の一番右の列(計、または当初予算の唯一の金額列)の境界をヘッダー行の位置から求める
  const columnCount = detectAmountColumnCount(tableItems);
  const headerRow = findHeaderRow(allRows);
  const rightColumnThreshold = findRightmostColumnThreshold(headerRow, columnCount);

  const categories: BudgetCategory[] = [];
  let current: BudgetCategory | null = null;

  for (const { row, leadingNumber } of candidateRows) {
    const isCategoryLevel = nearestCluster(row.items[0]!.x, leadingClusters) === categoryLevelX;
    const { nameItems, amountItems } = splitNameAndAmountItems(row.items.slice(1));
    const name = assembleName(nameItems);

    const rightColumnItems = amountItems.filter((item) => item.x >= rightColumnThreshold);
    const amountYen = parseAmountYen(rightColumnItems);

    if (isCategoryLevel) {
      if (amountYen === null) {
        continue;
      }
      current = { categoryNumber: leadingNumber, categoryName: name, amountYen, subItems: [] };
      categories.push(current);
    } else if (current && amountYen !== null && name.length > 0) {
      current.subItems.push({ name, amountYen });
    }
  }

  return categories;
}

export function parseExpenditureBudgetTable(items: PositionedTextItem[]): BudgetCategory[] {
  return parseBudgetTable(items, "歳出", "歳出合計");
}

export function parseRevenueBudgetTable(items: PositionedTextItem[]): BudgetCategory[] {
  return parseBudgetTable(items, "歳入", "歳入合計");
}
