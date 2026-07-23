import { eraYearToSeireki, pad2, type Era } from "../../infrastructure/scraper/eraDate.js";
import { computeTermBoundary } from "./termBoundaryCalculation.js";

/**
 * さいたま市議会議員選挙「得票数及び当選人」PDFのテキスト解析(docs/adr/0027)。
 *
 * pdftotext -layout(docs/adr/0027、pdf-parseがこのPDF種別のフォントを解決できない
 * ため採用)の出力は、区ごとに以下の形で列位置がほぼ保たれる(2003年実データで確認):
 *   得票順位   候補者氏名(姓)   候補者氏名(名)   党派   得票数
 * 各列は2つ以上の連続する半角空白で区切られている。当選人は丸数字(①②…)、
 * 落選者は算用数字。繰上当選により後から当選した候補者の行には先頭に「※」が付き、
 * 区の末尾に「※ 平成◯年◯月◯日、〜氏が議員を辞職したことにより、平成◯年◯月◯日に
 * 繰上補充選挙会が開催され、〜氏が繰上当選した。」という脚注が付く(実データで確認)。
 * 脚注は改行で折り返されることがあるため、空行または次区・execフッターまで連結する。
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

const VOTE_COUNT_PATTERN = /^[\d,]+\.\d+$/;

/** 列区切り(2個以上連続する半角空白)で分割し、得票順位・氏名(姓/名)・党派・得票数の5列に一致する行のみ候補行として解釈する */
function parseCandidateRow(line: string): ScrapedCandidateRow | null {
  const columns = line
    .trim()
    .split(/ {2,}/)
    .filter((column) => column.length > 0);
  if (columns.length !== 5) {
    return null;
  }
  const [rankToken, surname, givenName, party, votesToken] = columns as [string, string, string, string, string];
  const rank = parseRankToken(rankToken);
  if (!rank || !VOTE_COUNT_PATTERN.test(votesToken)) {
    return null;
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

const RESIGNATION_SUCCESSION_PATTERN =
  /(?<resignedName>[^、]+?)氏が議員を辞職したことにより.*?(?<successorName>[^、]+?)氏が繰上当選した/;

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

const WARD_HEADING_PATTERN = /【(?<ward>[^】]+)】/g;

/** pdftotext -layoutの出力全体(複数区分)を区ごとのテキストブロックに分割する */
function splitWardBlocks(rawText: string): { ward: string; text: string }[] {
  const headingMatches = [...rawText.matchAll(WARD_HEADING_PATTERN)];
  return headingMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < headingMatches.length ? (headingMatches[index + 1]!.index ?? rawText.length) : rawText.length;
    return { ward: match.groups!.ward!, text: rawText.slice(start, end) };
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
