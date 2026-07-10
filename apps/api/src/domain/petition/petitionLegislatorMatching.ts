/**
 * 請願文書表から抽出した紹介議員欄の原文を、既存の議員データと名寄せする(docs/adr/0026)。
 *
 * 紹介議員欄は複数人が並ぶことがあり、当初は「姓名内の区切りは1文字分の空白、
 * 人物間の区切りは2文字分以上の空白または改行」という前提でトークン分割していたが、
 * 実データで反例が見つかった: 短い氏名(例:「鳥羽　恵」)は姓名間にも2文字分の空白が
 * 入り(おそらく他の氏名と表示幅を揃えるための詰め物)、人物間の区切りと区別がつかない
 * (例:「久保 美樹　　竹腰　連　　中山 淳一」は空白の数だけでは正しく分割できない)。
 *
 * このため、原文をトークン分割してから照合するのではなく、原文(空白除去済み)の中に
 * 既知の議員名(空白除去済み)が部分文字列として含まれるかを1人ずつ調べる方式にする。
 * 表決態度PDFの解析(docs/adr/0017 voteStanceParsing.ts)と同じ「空白除去した完全一致」の
 * 発展形で、氏名の途中に紛れ込んだ空白の解釈に依存しない。
 *
 * 一致した議員名を取り除いた後に文字が残っていれば、未知の紹介議員がいるとみなし、
 * legislatorIdをnullのまま残す(捏造しない)。
 */

export interface KnownLegislator {
  id: string;
  name: string;
}

export interface MatchedIntroducer {
  rawName: string;
  legislatorId: string | null;
}

function stripWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

export function matchIntroducingLegislators(
  rawText: string,
  knownLegislators: KnownLegislator[],
): MatchedIntroducer[] {
  let remaining = stripWhitespace(rawText);
  if (!remaining) {
    return [];
  }

  const matches: MatchedIntroducer[] = [];
  // 氏名が他の議員の氏名の部分文字列にならないよう、長い氏名から優先的に照合する
  const sortedLegislators = [...knownLegislators].sort(
    (a, b) => stripWhitespace(b.name).length - stripWhitespace(a.name).length,
  );

  for (const legislator of sortedLegislators) {
    const strippedName = stripWhitespace(legislator.name);
    if (strippedName.length === 0) {
      continue;
    }
    if (remaining.includes(strippedName)) {
      matches.push({ rawName: legislator.name, legislatorId: legislator.id });
      remaining = remaining.replace(strippedName, "");
    }
  }

  if (remaining.length > 0) {
    // 既知の議員と一致しなかった残り(捏造しないよう原文のまま保持する)
    matches.push({ rawName: remaining, legislatorId: null });
  }

  return matches;
}
