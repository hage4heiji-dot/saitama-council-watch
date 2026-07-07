/**
 * 会議日程一覧(docs/adr/0023)の「時間・会議名」セルの解析。
 * <br>で区切られた行のうち、時刻(「10時」「9時30分」)または「散会後」で始まる行を
 * 新しい会議の開始とみなす。それ以外の行は、委員会名が長く折り返されているだけの
 * 継続行として直前の会議名に連結する(実データで確認済み。例:
 * 「決算特別委員会（概況説明、監査報告、総合振興計画基本計画実施状況報告、」+
 * 「区役所関係審査）【中継】」→「決算特別委員会（概況説明、監査報告、総合振興計画基本計画実施状況報告、区役所関係審査）【中継】」)。
 */

const ENTRY_START_PATTERN = /^(?:\d{1,2}時(?:\d{1,2}分)?|散会後)/;
const LEADING_TRAILING_SPACE_PATTERN = /^[\s　]+|[\s　]+$/g;

export interface CommitteeCellEntry {
  time: string | null;
  committeeName: string;
}

export function parseCommitteeCellLines(rawLines: string[]): CommitteeCellEntry[] {
  const entries: CommitteeCellEntry[] = [];

  for (const rawLine of rawLines) {
    const line = rawLine.replace(LEADING_TRAILING_SPACE_PATTERN, "");
    if (!line) {
      continue;
    }

    const match = ENTRY_START_PATTERN.exec(line);
    if (match) {
      const time = match[0];
      const committeeName = line.slice(time.length).replace(LEADING_TRAILING_SPACE_PATTERN, "");
      entries.push({ time, committeeName });
    } else {
      const last = entries[entries.length - 1];
      if (last) {
        last.committeeName += line;
      }
    }
    // 直前の会議がないまま継続行が来た場合(実データでは発生しない)は破棄する
  }

  return entries;
}

/**
 * 会議名の括弧書き(「（...）」「【...】」)を除いた基本名を返す。月次集計・分類向け
 * (例:「予算委員会（企業会計関係審査）【中継】」→「予算委員会」)。
 */
export function extractCommitteeBaseName(committeeName: string): string {
  return committeeName.replace(/(（[^）]*）|【[^】]*】)/g, "").trim();
}
