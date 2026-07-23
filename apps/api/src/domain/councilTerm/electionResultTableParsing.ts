import { eraYearToSeireki, pad2, type Era } from "../../infrastructure/scraper/eraDate.js";
import { computeTermBoundary } from "./termBoundaryCalculation.js";

/**
 * さいたま市議会議員選挙「得票数及び当選人」PDFのテキスト解析(docs/adr/0027)。
 *
 * pdftotext -layout(docs/adr/0027、pdf-parseがこのPDF種別のフォントを解決できない
 * ため採用)の出力は、区ごとに以下の列がほぼ保たれる:
 *   得票順位   候補者氏名(姓/名)   党派   得票数
 * ただし2003年(平成15年)PDFのみ、得票順位と氏名の間に広い空白(列位置合わせ)があるのに対し、
 * 2007年(平成19年)以降のPDFは得票順位と氏名の間が半角スペース1個のみで、氏名の姓/名の
 * 間隔も行によって1個〜複数個とまちまちである(実データで確認)。この差異を吸収するため、
 * まず行頭の得票順位(丸数字または算用数字、繰上当選対象は「※」接頭辞)を専用の正規表現で
 * 切り出してから、残りを2個以上の連続空白で列分割する(「得票順位+空白1個」と
 * 「列区切りの空白2個以上」を区別する)。
 *
 * 当選人は丸数字(①②…)、落選者は算用数字。繰上当選により後から当選した候補者の行には
 * 先頭に「※」が付き、区の末尾に「※ (平成◯年◯月◯日、|平成◯年◯月◯日に)〜氏が議員を
 * 辞職したことにより、平成◯年◯月◯日に繰上補充選挙会が開催され、〜氏が繰上当選した。」
 * という脚注が付く(2003年・2011年の実データで、句読点の入り方が異なる2パターンを確認)。
 * 脚注は改行で折り返されることがあるため、空行または次区・execフッターまで連結する。
 *
 * 区見出しの書式も年度によって異なる(実データで確認した3パターン):
 *   1. 2003年: 「【西区】」のように【】で囲む
 *   2. 2007〜2015年: 「西区」が単独行(前後に大きくインデントされることがある)
 *   3. 2019年以降: 「さいたま市議会議員一般選挙                        西区」のように
 *      選挙名と同じ行の末尾に区名が続く
 */

export interface ScrapedCandidateRow {
  rank: number;
  /** 当選人一覧に丸数字で載っている(繰上当選前の、投票時点の当落) */
  wasOriginallyElected: boolean;
  surname: string;
  givenName: string;
  party: string | null;
  voteCount: number;
}

export interface ResignationSuccessionEvent {
  resignedName: string;
  resignedDate: string;
  successionDate: string;
  successorName: string;
}

export interface WardElectionResult {
  ward: string;
  /** PDFに「当選人の任期」の明記があった場合のみ設定する(捏造しない) */
  termStartDate: string | null;
  termEndDate: string | null;
  candidates: ScrapedCandidateRow[];
  resignationEvents: ResignationSuccessionEvent[];
}

function stripWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";

function toHalfWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (digit) => String(FULL_WIDTH_DIGITS.indexOf(digit)));
}

/** 丸数字(①〜⑳、U+2460〜U+2473)を数値に変換する。当選人一覧の当選順位を表す */
function circledDigitToNumber(token: string): number | null {
  if ([...token].length !== 1) {
    return null;
  }
  const code = token.codePointAt(0);
  if (code === undefined || code < 0x2460 || code > 0x2473) {
    return null;
  }
  return code - 0x2460 + 1;
}

interface ParsedRankToken {
  rank: number;
  wasOriginallyElected: boolean;
  /** 繰上当選の脚注対象であることを示す「※」接頭辞付き行かどうか */
  hasSuccessionMarker: boolean;
}

function parseRankToken(token: string): ParsedRankToken | null {
  const hasSuccessionMarker = token.startsWith("※");
  const core = hasSuccessionMarker ? token.slice(1) : token;
  const circled = circledDigitToNumber(core);
  if (circled !== null) {
    return { rank: circled, wasOriginallyElected: true, hasSuccessionMarker };
  }
  if (/^\d{1,2}$/.test(core)) {
    return { rank: Number(core), wasOriginallyElected: false, hasSuccessionMarker };
  }
  return null;
}

// 得票数は年度により小数第三位まで表記される場合(2003年、あん分得票)と整数のみの場合がある
const VOTE_COUNT_PATTERN = /^[\d,]+(?:\.\d+)?$/;

// 行頭の得票順位(丸数字/算用数字、繰上当選対象は「※」接頭辞)と、それに続く空白1個以上を切り出す。
// 得票順位と氏名の間の空白は年度によって1個〜複数個とまちまちなため、ここでは「1個以上」とし、
// 残りの列区切り(2個以上の空白)と区別する。
const RANK_PREFIX_PATTERN = /^\s*(?<rankToken>※?(?:[①-⑳]|\d{1,2}))\s+(?<rest>\S.*)$/;

/**
 * 行頭の得票順位を切り出した後、残りを2個以上の連続空白で列分割する。
 * 氏名の姓/名の間隔が広い場合は[姓, 名, 党派, 得票数]の4列、狭い(1個)場合は
 * 姓名が1列にまとまり[姓名, 党派, 得票数]の3列になる。いずれも末尾2列が党派・得票数、
 * 残りが姓名(1〜2列)という構造は変わらないため、末尾から解決する。
 */
function parseCandidateRow(line: string): ScrapedCandidateRow | null {
  const prefixMatch = RANK_PREFIX_PATTERN.exec(line);
  if (!prefixMatch?.groups) {
    return null;
  }
  const rank = parseRankToken(prefixMatch.groups.rankToken!);
  if (!rank) {
    return null;
  }

  const restColumns = prefixMatch.groups
    .rest!.trim()
    .split(/ {2,}/)
    .filter((column) => column.length > 0);
  if (restColumns.length < 3) {
    return null;
  }
  const votesToken = restColumns[restColumns.length - 1]!;
  const party = restColumns[restColumns.length - 2]!;
  const nameColumns = restColumns.slice(0, restColumns.length - 2);
  if (!VOTE_COUNT_PATTERN.test(votesToken) || nameColumns.length === 0) {
    return null;
  }

  let surname: string;
  let givenName: string;
  if (nameColumns.length >= 2) {
    surname = nameColumns[0]!;
    givenName = nameColumns.slice(1).join("");
  } else {
    // 姓名が1列にまとまっている場合、半角スペース1個で区切られている(実データで確認)
    const nameParts = nameColumns[0]!.split(" ").filter((part) => part.length > 0);
    surname = nameParts[0] ?? nameColumns[0]!;
    givenName = nameParts.slice(1).join("");
  }

  return {
    rank: rank.rank,
    wasOriginallyElected: rank.wasOriginallyElected,
    surname,
    givenName,
    party: party === "無所属" ? null : party,
    voteCount: Number(votesToken.replace(/,/g, "")),
  };
}

const ERA_DATE_PATTERN = /(?<era>平成|令和)(?<year>[0-9０-９]+)年(?<month>[0-9０-９]+)月(?<day>[0-9０-９]+)日/g;

function findEraDates(text: string): string[] {
  return [...text.matchAll(ERA_DATE_PATTERN)].map((match) => {
    const groups = match.groups as { era: Era; year: string; month: string; day: string };
    const seireki = eraYearToSeireki(groups.era, Number(toHalfWidthDigits(groups.year)));
    return `${seireki}-${pad2(Number(toHalfWidthDigits(groups.month)))}-${pad2(Number(toHalfWidthDigits(groups.day)))}`;
  });
}

/** 「当選人の任期 ◯◯年◯月◯日〜◯◯年◯月◯日」の行から任期日付を抽出する(明記がない年度も多い。捏造しない) */
function parseWardTermDates(blockText: string): { termStartDate: string | null; termEndDate: string | null } {
  for (const line of blockText.split("\n")) {
    if (!line.includes("当選人の任期")) {
      continue;
    }
    const dates = findEraDates(line);
    if (dates.length >= 2) {
      return { termStartDate: dates[0]!, termEndDate: dates[1]! };
    }
  }
  return { termStartDate: null, termEndDate: null };
}

// 日付+氏名の間の区切りが「、」(2003年実データ)か「に」(2011年実データ、読点なし)かが
// 年度によって異なるため、両対応の定型文パターンにする。resignedName/successorNameの
// 非貪欲マッチは直前の日付パターンで開始位置が固定されるため、句読点の有無に依存しない。
const DATE_SUB_PATTERN = "(?:平成|令和)[0-9０-９]+年[0-9０-９]+月[0-9０-９]+日";
const RESIGNATION_SUCCESSION_PATTERN = new RegExp(
  `${DATE_SUB_PATTERN}[、に](?<resignedName>[^、]+?)氏が議員を辞職したことにより、?${DATE_SUB_PATTERN}に繰上補充選挙会が開催され、?(?<successorName>[^、]+?)氏が繰上当選した`,
);

function parseResignationSuccessionSentence(text: string): ResignationSuccessionEvent | null {
  const dates = findEraDates(text);
  const match = RESIGNATION_SUCCESSION_PATTERN.exec(text);
  if (dates.length < 2 || !match?.groups?.resignedName || !match.groups.successorName) {
    // 期待する定型文と一致しない場合は解決しない(捏造しない。呼び出し側で
    // successorRawName等が空のまま残り、後日目視で補完できるようにする)
    return null;
  }
  return {
    resignedName: match.groups.resignedName.trim(),
    resignedDate: dates[0]!,
    successionDate: dates[1]!,
    successorName: match.groups.successorName.trim(),
  };
}

/** 「※」開始行(「※6」のような候補行の接頭辞は除く)から、折り返し継続行を連結して脚注を集める */
function parseResignationSuccessionFootnotes(blockText: string): ResignationSuccessionEvent[] {
  const lines = blockText.split("\n");
  const events: ResignationSuccessionEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line.startsWith("※") || /^※\s*\d/.test(line)) {
      continue;
    }
    let combined = line.slice(1).trim();
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j]!.trim();
      if (next.length === 0 || /執行.*選挙$/.test(next)) {
        break;
      }
      combined += next;
      j++;
    }
    const event = parseResignationSuccessionSentence(combined);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

// さいたま市の行政区(2005年の岩槻区編入以降10区。2003年時点は岩槻区を含まない9区)
const WARD_NAMES = ["西区", "北区", "大宮区", "見沼区", "中央区", "桜区", "浦和区", "南区", "緑区", "岩槻区"];

/**
 * 区見出し行を検出する。年度によって3通りの書式があるため(ファイル冒頭のコメント参照)、
 * いずれかに一致した区名を返す。それ以外の行はnull。
 */
function matchWardHeading(line: string): string | null {
  const trimmed = line.trim();
  for (const ward of WARD_NAMES) {
    // 2003年形式:「【西区】                    0:50 確定」のように【】の後に別の情報が続くため、
    // 行全体の一致ではなく部分一致で判定する
    if (trimmed.includes(`【${ward}】`)) {
      return ward;
    }
    // 2007〜2015年形式: 区名のみの行
    if (trimmed === ward) {
      return ward;
    }
    // 2019年以降形式: 選挙名と同じ行の末尾に区名が続く
    if (trimmed.includes("市議会議員一般選挙") && trimmed.endsWith(ward)) {
      return ward;
    }
  }
  return null;
}

/** pdftotext -layoutの出力全体(複数区分)を区ごとのテキストブロックに分割する */
function splitWardBlocks(rawText: string): { ward: string; text: string }[] {
  const lines = rawText.split("\n");
  const headings: { ward: string; lineIndex: number }[] = [];
  lines.forEach((line, index) => {
    const ward = matchWardHeading(line);
    if (ward) {
      headings.push({ ward, lineIndex: index });
    }
  });

  return headings.map(({ ward, lineIndex }, index) => {
    const endLineIndex = index + 1 < headings.length ? headings[index + 1]!.lineIndex : lines.length;
    return { ward, text: lines.slice(lineIndex, endLineIndex).join("\n") };
  });
}

export function parseElectionResultDocument(rawText: string): WardElectionResult[] {
  return splitWardBlocks(rawText).map(({ ward, text }) => {
    const { termStartDate, termEndDate } = parseWardTermDates(text);
    const candidates = text
      .split("\n")
      .map((line) => parseCandidateRow(line))
      .filter((row): row is ScrapedCandidateRow => row !== null);
    const resignationEvents = parseResignationSuccessionFootnotes(text);
    return { ward, termStartDate, termEndDate, candidates, resignationEvents };
  });
}

export interface CouncilTermCandidate {
  ward: string;
  origin: "election" | "runner_up_succession";
  electionKind: "regular" | "by_election" | null;
  electionDate: string | null;
  candidateRawName: string;
  partyRawName: string | null;
  electedRank: number | null;
  voteCount: number | null;
  termStartDate: string;
  termStartDateBasis: "explicit" | "assumed";
  termEndDate: string | null;
  termEndDateBasis: "explicit" | "assumed" | null;
  resignedDate: string | null;
  successorRawName: string | null;
  predecessorRawName: string | null;
}

function findCandidateByName(candidates: ScrapedCandidateRow[], rawName: string): ScrapedCandidateRow | undefined {
  const target = stripWhitespace(rawName);
  return candidates.find((candidate) => stripWhitespace(`${candidate.surname}${candidate.givenName}`) === target);
}

/**
 * 区の解析結果から、実際に議席を得た人物ごとのCouncilTerm候補行を組み立てる。
 * 通常当選者は1行、辞職により繰上当選した人物はさらに1行(origin=runner_up_succession)
 * を追加する。任期終了日は法定満了日をそのまま保持し(その議席の任期そのものの情報)、
 * 途中辞職の事実はresignedDateで別途表現する(捏造しない。2つの事実を混同しない)。
 */
export function buildCouncilTermCandidates(
  wardResult: WardElectionResult,
  electionDate: string,
  electionKind: "regular" | "by_election",
): CouncilTermCandidate[] {
  const boundary = computeTermBoundary({
    explicitStartDate: wardResult.termStartDate,
    explicitEndDate: wardResult.termEndDate,
    fallbackOriginDate: electionDate,
  });

  const elected: CouncilTermCandidate[] = wardResult.candidates
    .filter((candidate) => candidate.wasOriginallyElected)
    .map((candidate) => {
      const candidateRawName = `${candidate.surname} ${candidate.givenName}`;
      const resignation = wardResult.resignationEvents.find(
        (event) => stripWhitespace(event.resignedName) === stripWhitespace(candidateRawName),
      );
      return {
        ward: wardResult.ward,
        origin: "election",
        electionKind,
        electionDate,
        candidateRawName,
        partyRawName: candidate.party,
        electedRank: candidate.rank,
        voteCount: candidate.voteCount,
        termStartDate: boundary.termStartDate,
        termStartDateBasis: boundary.termStartDateBasis,
        termEndDate: boundary.termEndDate,
        termEndDateBasis: boundary.termEndDateBasis,
        resignedDate: resignation?.resignedDate ?? null,
        successorRawName: resignation?.successorName ?? null,
        predecessorRawName: null,
      };
    });

  const successors: CouncilTermCandidate[] = wardResult.resignationEvents.map((event) => {
    const matchedCandidate = findCandidateByName(wardResult.candidates, event.successorName);
    const successionBoundary = computeTermBoundary({
      explicitStartDate: event.successionDate,
      explicitEndDate: wardResult.termEndDate,
      fallbackOriginDate: event.successionDate,
    });
    return {
      ward: wardResult.ward,
      origin: "runner_up_succession",
      electionKind: null,
      electionDate: null,
      candidateRawName: matchedCandidate
        ? `${matchedCandidate.surname} ${matchedCandidate.givenName}`
        : event.successorName,
      partyRawName: matchedCandidate?.party ?? null,
      electedRank: matchedCandidate?.rank ?? null,
      voteCount: matchedCandidate?.voteCount ?? null,
      termStartDate: successionBoundary.termStartDate,
      termStartDateBasis: successionBoundary.termStartDateBasis,
      termEndDate: successionBoundary.termEndDate,
      termEndDateBasis: successionBoundary.termEndDateBasis,
      resignedDate: null,
      successorRawName: null,
      predecessorRawName: event.resignedName,
    };
  });

  return [...elected, ...successors];
}
