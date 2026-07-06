/**
 * グラウンディング検証の一次防御(機械的チェック)。
 * docs/design/01-basic-design.md §6.2「出力中の固有名詞・数値が原本テキストに
 * 存在するかを突合」に対応。
 *
 * 日本語の固有名詞抽出には形態素解析が必要でありYAGNIの観点からPhase3の
 * スコープ外とする。数値(金額・日付・条数等)は議案の性質上もっとも
 * ハルシネーションの実害が大きい要素であるため、これのみを対象とする
 * (docs/adr/0013)。
 */
export interface MechanicalCheckResult {
  passed: boolean;
  unsupportedNumbers: string[];
}

const NUMBER_PATTERN = /[0-9０-９]+(?:[.,．，][0-9０-９]+)?/g;

function toHalfWidth(text: string): string {
  return text.replace(/[０-９．，]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0),
  );
}

export function mechanicalGroundingCheck(sourceText: string, summary: string): MechanicalCheckResult {
  const normalizedSource = toHalfWidth(sourceText);
  const candidateNumbers = summary.match(NUMBER_PATTERN) ?? [];

  const unsupportedNumbers = [...new Set(candidateNumbers)].filter(
    (token) => !normalizedSource.includes(toHalfWidth(token)),
  );

  return {
    passed: unsupportedNumbers.length === 0,
    unsupportedNumbers,
  };
}
