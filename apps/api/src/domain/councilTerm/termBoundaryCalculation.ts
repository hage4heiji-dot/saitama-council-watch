/**
 * 任期の開始日・終了日を決定する(docs/adr/0027)。
 *
 * 平成15年(2003年)PDFには「当選人の任期 平成15年５月１日〜平成19年４月30日」と
 * 明記されており、これは実データで確認できた唯一のEXPLICITな根拠。
 *
 * 【要検証の仮定】(docs/adr/0027参照): 他の年度のPDFにはこの任期表記がないため、
 * 統一地方選挙の慣例(投票翌月1日〜4年後の前日)から算出する。これは2003年の
 * 実データ1件から一般化した仮定であり、地方自治法上の任期起算日の一般原則を
 * 確認できていない。断定を避けるため、算出した値には必ずASSUMEDを付け、
 * EXPLICITな値と区別する。
 */

export type DateBasis = "explicit" | "assumed";

export interface TermBoundary {
  termStartDate: string;
  termStartDateBasis: DateBasis;
  termEndDate: string | null;
  termEndDateBasis: DateBasis | null;
}

export interface ComputeTermBoundaryInput {
  explicitStartDate: string | null;
  explicitEndDate: string | null;
  /** 当選日(通常選挙)または繰上当選が確定した日(補欠)。ASSUMED算出のフォールバック起点 */
  fallbackOriginDate: string;
}

function addYearsSubtractOneDay(isoDate: string, years: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function firstOfNextMonth(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 1);
  return date.toISOString().slice(0, 10);
}

export function computeTermBoundary(input: ComputeTermBoundaryInput): TermBoundary {
  const termStartDate = input.explicitStartDate ?? firstOfNextMonth(input.fallbackOriginDate);
  const termStartDateBasis: DateBasis = input.explicitStartDate ? "explicit" : "assumed";

  const termEndDate = input.explicitEndDate ?? addYearsSubtractOneDay(termStartDate, 4);
  const termEndDateBasis: DateBasis = input.explicitEndDate ? "explicit" : "assumed";

  return { termStartDate, termStartDateBasis, termEndDate, termEndDateBasis };
}
