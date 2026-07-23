import type { CouncilTerm } from "@saitama-council-watch/shared-types";

export interface PersonRow {
  key: string;
  displayName: string;
  ward: string;
  legislatorId: string | null;
  terms: CouncilTerm[];
}

function normalizeName(value: string): string {
  return value.replace(/[\s　]/g, "");
}

/**
 * CouncilTermを人物ごとにグルーピングする(docs/adr/0027)。legislatorIdが設定されている
 * 行はそれで束ね(取り込み時に確信を持って一致できた場合のみ設定されている、捏造しない方針)、
 * 未設定の行は(区, 正規化した候補者名)でフォールバックする。
 *
 * 【既知の制約】フォールバックのグルーピングは表示上のヒューリスティックであり、
 * 同じ区に同姓同名の別人がいた場合、誤って同一人物として結合してしまうリスクがある
 * (matchIntroducingLegislatorsが完全一致以外のあいまい一致を避けているのと同種のリスク)。
 */
export function groupCouncilTermsByPerson(terms: CouncilTerm[]): PersonRow[] {
  const rows = new Map<string, PersonRow>();

  for (const term of terms) {
    const key = term.legislatorId ? `legislator:${term.legislatorId}` : `ward:${term.ward}:${normalizeName(term.candidateName)}`;
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        displayName: term.candidateName,
        ward: term.ward,
        legislatorId: term.legislatorId,
        terms: [],
      };
      rows.set(key, row);
    }
    row.terms.push(term);
  }

  for (const row of rows.values()) {
    row.terms.sort((a, b) => a.termStartDate.localeCompare(b.termStartDate));
  }

  return [...rows.values()].sort((a, b) => {
    const aLatest = a.terms[a.terms.length - 1]!.termStartDate;
    const bLatest = b.terms[b.terms.length - 1]!.termStartDate;
    return bLatest.localeCompare(aLatest) || a.ward.localeCompare(b.ward, "ja") || a.displayName.localeCompare(b.displayName, "ja");
  });
}
