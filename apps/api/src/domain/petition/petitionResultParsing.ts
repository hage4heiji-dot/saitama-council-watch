/**
 * 「請願審議結果一覧」PDFの解析(docs/adr/0026)。
 *
 * このPDFも表ではなく、請願ごとに「番号 → 受理日(年行+月日行) → 件名(1行以上) →
 * 審議結果 → 議決日(年行+月日行)」が上から順に並ぶテキストであり、座標なし抽出でも
 * 列が入れ替わらず読める(実データで確認済み)。既知の結果キーワードが現れるまでを
 * 件名として扱う状態機械でパースする(会議日程一覧の解析(parseCommitteeCellLines)と
 * 同様の方針)。
 */

export interface ParsedPetitionResult {
  petitionNumber: string;
  /** 実データにある文言をそのまま保持する(捏造しない) */
  resultText: string;
  /**
   * 継続審査(継続審議)は次回以降の会期へ結論を持ち越すため、この時点ではまだ
   * 議決日が存在しない(実データで確認済み: 該当請願が結果一覧の末尾にあり、
   * 議決日の行自体が無い)。このためnullを許容する。
   */
  decidedDate: string | null;
}

const RESULT_KEYWORDS = ["採択", "不採択", "取下げ", "継続審査", "継続審議"];

const NUMBER_LINE_PATTERN = /^[0-9０-９]+$/;
const YEAR_LINE_PATTERN = /^令和(?<year>[0-9０-９]+)年$/;
const MONTH_DAY_LINE_PATTERN = /^(?<month>[0-9０-９]+)月(?<day>[0-9０-９]+)日$/;

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";
function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String(FULL_WIDTH_DIGITS.indexOf(digit)));
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

function parseIsoDate(yearLine: string, monthDayLine: string): string | null {
  const yearMatch = YEAR_LINE_PATTERN.exec(yearLine);
  const monthDayMatch = MONTH_DAY_LINE_PATTERN.exec(monthDayLine);
  if (!yearMatch?.groups?.year || !monthDayMatch?.groups?.month || !monthDayMatch?.groups?.day) {
    return null;
  }
  const seireki = 2018 + Number(toHalfWidthDigits(yearMatch.groups.year));
  return `${seireki}-${pad2(toHalfWidthDigits(monthDayMatch.groups.month))}-${pad2(toHalfWidthDigits(monthDayMatch.groups.day))}`;
}

export function parsePetitionResultsList(rawText: string): ParsedPetitionResult[] {
  const lines = rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const results: ParsedPetitionResult[] = [];
  let i = 0;

  while (i < lines.length) {
    const numberLine = lines[i]!;
    if (!NUMBER_LINE_PATTERN.test(numberLine)) {
      i += 1;
      continue;
    }

    // 受理日(年行+月日行)。件名には使わないため読み飛ばす。
    const receivedYearLine = lines[i + 1];
    const receivedMonthDayLine = lines[i + 2];
    if (!receivedYearLine || !receivedMonthDayLine || !parseIsoDate(receivedYearLine, receivedMonthDayLine)) {
      i += 1;
      continue;
    }

    // 件名(1行以上)を、既知の結果キーワード行が現れるまで収集する。
    let cursor = i + 3;
    let resultText: string | null = null;
    while (cursor < lines.length) {
      const line = lines[cursor]!;
      if (RESULT_KEYWORDS.includes(line)) {
        resultText = line;
        break;
      }
      cursor += 1;
    }
    if (!resultText) {
      // 結果キーワードが見つからない(未審議・想定外の書式)場合はこれ以上解決できない
      break;
    }

    // 議決日(年行+月日行)。継続審査等、まだ議決日が無い場合は行自体が存在しない
    // (実データで確認済み。結果一覧の末尾にそのまま結果キーワードだけが現れる)。
    const decidedYearLine = lines[cursor + 1];
    const decidedMonthDayLine = lines[cursor + 2];
    const hasTrailingDateLines = decidedYearLine !== undefined && decidedMonthDayLine !== undefined;
    const decidedDate = hasTrailingDateLines ? parseIsoDate(decidedYearLine, decidedMonthDayLine) : null;
    if (hasTrailingDateLines && !decidedDate) {
      // 議決日の行はあるが既知の書式で解釈できない(想定外)。以降の行の対応がずれる
      // おそれがあるため、これ以上は解決しない(捏造しない)。
      break;
    }

    results.push({
      petitionNumber: toHalfWidthDigits(numberLine),
      resultText,
      decidedDate,
    });

    i = hasTrailingDateLines ? cursor + 3 : lines.length;
  }

  return results;
}

/**
 * 審議結果の原文をPetitionStatusにマッピングする(bill/deliberationResult.tsの
 * mapDeliberationResultToStatusと同じ方針)。未知の文言はunconfirmedにする(捏造しない)。
 * 現在のRESULT_KEYWORDSはこの4種のみのため、実際にはnullは返らない想定だが、
 * 将来キーワードが増えた場合の安全側の分岐として残す。
 */
export function mapPetitionResultToStatus(resultText: string): "adopted" | "rejected" | "withdrawn" | "carried_over" | null {
  switch (resultText) {
    case "採択":
      return "adopted";
    case "不採択":
      return "rejected";
    case "取下げ":
      return "withdrawn";
    case "継続審査":
    case "継続審議":
      return "carried_over";
    default:
      return null;
  }
}
