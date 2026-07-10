/**
 * さいたま市議会サイト共通: 和暦(令和/平成)の会期名解析ユーティリティ。
 * 議案スクレイパー・会議日程スクレイパーの双方で同じ会期名書式
 * (例: "令和8年6月定例会")を扱うため共通化する(DRY)。
 */

export type Era = "令和" | "平成";

const SESSION_CORE_PATTERN =
  /^(?<core>(?<era>令和|平成)(?<eraYear>\d+)年(?<month>\d+)月(?:（[^）]*）)?(?:定例会|臨時会))/;

export interface SessionCore {
  core: string;
  era: Era;
  eraYear: number;
  month: number;
  /** 定例会か臨時会か。資料検索システム(Discuss Cabinet)のフォルダ名一致に使う */
  sessionKind: "定例会" | "臨時会";
}

/** リンクテキストの先頭から会期名の核("令和8年6月定例会"等)を抽出する */
export function parseSessionCore(text: string): SessionCore | null {
  const match = SESSION_CORE_PATTERN.exec(text);
  const { core, era, eraYear, month } = match?.groups ?? {};
  if (!core || !era || !eraYear || !month) {
    return null;
  }
  return {
    core,
    era: era as Era,
    eraYear: Number(eraYear),
    month: Number(month),
    sessionKind: core.endsWith("臨時会") ? "臨時会" : "定例会",
  };
}

export function eraYearToSeireki(era: Era, eraYear: number): number {
  return era === "令和" ? 2018 + eraYear : 1988 + eraYear;
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

const FULL_WIDTH_DIGITS = "０１２３４５６７８９";

/**
 * 半角数字を全角数字に変換する(資料検索システムのフォルダ名は全角表記のため)。
 * ただし12月のフォルダのみ実データで確認する限り「12月定例会」と半角のまま
 * (他の月は「２月」「６月」「９月」のように1文字の全角、年も「令和８年」のように
 * 1桁は全角)表記されているため、2桁の値は全角変換しない(捏造しない: 未確認の
 * 2桁表記を推測で全角化しない)。
 */
export function toFullWidthDigits(value: number): string {
  const text = String(value);
  if (text.length >= 2) {
    return text;
  }
  return text.replace(/[0-9]/g, (digit) => FULL_WIDTH_DIGITS[Number(digit)] ?? digit);
}
