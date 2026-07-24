/**
 * CouncilTerm(選挙結果PDFの当選者)と既存Legislatorの名寄せ(docs/adr/0027)。
 *
 * まず氏名(空白除去)の完全一致を試みるが、実データではこれだけだとほとんど一致しない。
 * 選挙結果PDFの氏名表記は姓名の一方または両方がひらがなのことが多い(例:
 * 「石関 ひろおみ」「かみさか たつあき」)一方、現在の議員名簿は漢字表記のため、文字列
 * としては一致しないが読みは一致する。議員名簿にはnameKana(読み)があるので、姓名を
 * 空白で分割したうえでトークンごとに「漢字が完全一致」または「ひらがな化した読みが一致」
 * のいずれかを満たせば同一人物とみなす。漢字トークンは引き続き完全一致を要求するため、
 * 読みは同じだが漢字が違う別人を誤って一致させることはない。トークン数が食い違う、
 * あるいは複数の議員が一致してしまう場合は確信が持てないためnullのままにする
 * (petitionLegislatorMatching.tsのmatchIntroducingLegislatorsと同じ「捏造しない」方針)。
 */

export interface CandidateLegislator {
  id: string;
  name: string;
  nameKana: string;
}

function splitTokens(value: string): string[] {
  return value.split(/[\s　]+/).filter((token) => token.length > 0);
}

function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function stripWhitespace(value: string): string {
  return value.replace(/[\s　]/g, "");
}

function tokenMatches(candidateToken: string, nameToken: string, kanaToken: string): boolean {
  return candidateToken === nameToken || katakanaToHiragana(candidateToken) === katakanaToHiragana(kanaToken);
}

function readingMatches(candidateRawName: string, legislator: CandidateLegislator): boolean {
  const candidateTokens = splitTokens(candidateRawName);
  const nameTokens = splitTokens(legislator.name);
  const kanaTokens = splitTokens(legislator.nameKana);
  if (
    candidateTokens.length === 0 ||
    candidateTokens.length !== nameTokens.length ||
    candidateTokens.length !== kanaTokens.length
  ) {
    return false;
  }
  return candidateTokens.every((token, i) => tokenMatches(token, nameTokens[i]!, kanaTokens[i]!));
}

export function matchCouncilTermLegislator(
  candidateRawName: string,
  legislators: CandidateLegislator[],
): string | null {
  const exactMatch = legislators.find(
    (legislator) => stripWhitespace(legislator.name) === stripWhitespace(candidateRawName),
  );
  if (exactMatch) {
    return exactMatch.id;
  }

  const readingMatched = legislators.filter((legislator) => readingMatches(candidateRawName, legislator));
  return readingMatched.length === 1 ? readingMatched[0]!.id : null;
}
