/**
 * 「請願文書表」PDFの解析(docs/adr/0026)。
 *
 * このPDFは表ではなく、請願ごとに「付託委員会名 → 請願番号/受理年月日 → 件名 →
 * 請願者 → 紹介議員 → 要旨」という縦に並ぶラベル付きテキストであり、
 * pdf-parseの既定のテキスト抽出(座標なし)でも列が入れ替わらず読める
 * (予算表(docs/adr/0024)のような列スクランブル問題は起きない、実データで確認済み)。
 *
 * 先頭にある要約表(列見出しが「付　託」+改行+「委員会名」のように2行に分かれる)は、
 * 本文中の「付託委員会名」(空白なしの連続文字列)とは一致しないため、単純な文字列一致で
 * 誤検出しない。
 */

export interface ParsedPetitionDetail {
  /** 例: "28"、"1"(会計年度内でリセットされることがある。実データで確認済み) */
  petitionNumber: string;
  /** ISO日付 */
  receivedDate: string;
  title: string;
  /** 住所は原本でも伏字(○)のため保持しない。氏名/団体名のみ */
  petitionerName: string;
  /**
   * 紹介議員欄の原文(未加工)。1件の請願に複数人つくことがあり(実データで確認済み)、
   * かつ短い氏名(例:「鳥羽　恵」)は姓名間に2文字分の空白が入り、複数人の区切りと
   * 見分けがつかない(実データで確認済み)。このため人物の分割・名寄せは、既知の
   * 議員名で原文を検索する方式(domain/petition/petitionLegislatorMatching.ts)に委ねる。
   */
  introducingLegislatorsRawText: string;
  committeeName: string;
  /** 要旨・理由をまとめたもの(捏造しない。定型文言のみ除去) */
  summary: string;
}

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String(FULL_WIDTH_DIGITS.indexOf(digit)));
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

/** 地方自治法第124条にもとづく定型の結び文言。実質的な内容ではないため要旨から除く */
const BOILERPLATE_SUFFIX_PATTERN = /以上[、,]\s*地方自治法第\s*124\s*条の規定により[、,]?\s*請願(?:いたします|します)[。.]?\s*$/;

function stripWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

/**
 * 住所欄の伏字(○のみの行)を除いた行を氏名/団体名として連結する。
 * 個人と団体代表者を併記する場合、伏字が空白区切りで複数グループに分かれることがある
 * (実データで確認済み: 「○○○○○○○○○○○○○ ○○○○○○○」)ため、
 * 空白を含めて○のみで構成される行も伏字として除外する。
 */
function extractPetitioner(block: string): string {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[○◯\s　]+$/.test(line));
  return lines.join(" ").replace(/\s+/g, " ").trim();
}

function extractSummary(block: string): string {
  return block.trim().replace(BOILERPLATE_SUFFIX_PATTERN, "").trim();
}

/**
 * ページの繰り返し見出し(「令和８年２月定例会 請願文書表」)とページ番号(「- 2 -」)は、
 * 次のブロックの直前に挟まるため、要旨に混入しないよう事前に取り除く。
 */
const PAGE_HEADER_LINE_PATTERN = /^令和[0-9０-９]+年[0-9０-９]+月定例会\s*請願文書表(?:[（(]その[0-9０-９]+[）)])?\s*$/;
const PAGE_NUMBER_LINE_PATTERN = /^-\s*[0-9０-９]+\s*-$/;

function stripPageNoise(rawText: string): string {
  return rawText
    .split("\n")
    .filter((line) => !PAGE_HEADER_LINE_PATTERN.test(line.trim()) && !PAGE_NUMBER_LINE_PATTERN.test(line.trim()))
    .join("\n");
}

const BLOCK_PATTERN =
  /付託委員会名\s*(?<committee>\S+)[\s\S]*?請願番号\s*(?<num>[0-9０-９]+)\s*受理年月日\s*令和(?<year>[0-9０-９]+)年(?<month>[0-9０-９]+)月(?<day>[0-9０-９]+)日\s*件\s*名\s*(?<title>[\s\S]*?)請願者\s*住所・氏名\s*(?<petitioner>[\s\S]*?)紹介議員\s*氏\s*名\s*(?<legislators>[\s\S]*?)要\s*旨\s*(?<summary>[\s\S]*?)(?=付託委員会名|$)/g;

export function parsePetitionDocumentTable(rawText: string): ParsedPetitionDetail[] {
  const results: ParsedPetitionDetail[] = [];
  const cleanedText = stripPageNoise(rawText);

  for (const match of cleanedText.matchAll(BLOCK_PATTERN)) {
    const { committee, num, year, month, day, title, petitioner, legislators, summary } = match.groups ?? {};
    if (!committee || !num || !year || !month || !day || !title || !summary) {
      continue;
    }

    results.push({
      petitionNumber: toHalfWidthDigits(num),
      receivedDate: `${2018 + Number(toHalfWidthDigits(year))}-${pad2(toHalfWidthDigits(month))}-${pad2(toHalfWidthDigits(day))}`,
      title: stripWhitespace(title),
      petitionerName: extractPetitioner(petitioner ?? ""),
      introducingLegislatorsRawText: (legislators ?? "").trim(),
      committeeName: committee,
      summary: extractSummary(summary),
    });
  }

  return results;
}
