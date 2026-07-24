import Link from "next/link";
import type { CouncilTerm, Legislator } from "@saitama-council-watch/shared-types";
import type { PersonRow } from "@/lib/councilTermMatrix";

/**
 * 議員任期履歴のマトリクス(横軸:年、縦軸:人物、docs/adr/0027)。
 * ADR-0023§3の方針(専用チャートコンポーネントを作らず質素なスタイルに合わせる)を踏襲し、
 * チャートライブラリは使わずCSS Gridのみで組む。区ごとに独立したグリッド要素になるが、
 * 列幅を固定px(名前列200px・年列32px)にすることで、見出し行と各区のグリッドの列位置を
 * 一致させている(fr単位だと各グリッドが独立に列幅を計算してしまい、区ごとにずれるため)。
 *
 * legislatorsByIdは現職議員のみを含む(fetchLegislators()のデフォルトがisActive=trueのみ返す
 * ため)。legislatorIdが一致した行だけ現職マーク+会派を出す(docs/adr/0027の「捏造しない」方針
 * のとおり、legislatorIdは取り込み時に確信を持って一致できた場合のみ設定されている)。
 */
interface CouncilTermMatrixProps {
  rowsByWard: Map<string, PersonRow[]>;
  minYear: number;
  maxYear: number;
  legislatorsById: Map<string, Legislator>;
}

const NAME_COLUMN_WIDTH = 200;
const YEAR_COLUMN_WIDTH = 32;

function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4));
}

function gridTemplateColumns(yearCount: number): string {
  return `${NAME_COLUMN_WIDTH}px repeat(${yearCount}, ${YEAR_COLUMN_WIDTH}px)`;
}

function TermBar({ term, minYear, maxYear }: { term: CouncilTerm; minYear: number; maxYear: number }) {
  const startYear = Math.max(yearOf(term.termStartDate), minYear);
  const endYear = Math.min(term.termEndDate ? yearOf(term.termEndDate) : maxYear, maxYear);
  const startCol = startYear - minYear + 2; // 1列目は氏名ラベル
  const endCol = endYear - minYear + 3;

  const isSuccession = term.origin === "runner_up_succession";
  const label = `${term.ward} ${term.candidateName}: ${term.termStartDate}〜${term.termEndDate ?? "?"}${
    isSuccession ? "(繰上当選)" : ""
  }${term.resignedDate ? `(${term.resignedDate}辞職)` : ""}`;

  return (
    <div
      title={label}
      aria-label={label}
      className={`my-1 h-3 rounded-full ${isSuccession ? "bg-series-1/50" : "bg-series-1"}`}
      style={{ gridColumn: `${startCol} / ${endCol}` }}
    />
  );
}

export function CouncilTermMatrix({ rowsByWard, minYear, maxYear, legislatorsById }: CouncilTermMatrixProps) {
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const columns = gridTemplateColumns(years.length);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <div className="min-w-max">
          <div className="sticky top-0 z-20 grid" style={{ gridTemplateColumns: columns }}>
            <div className="sticky left-0 z-10 border-b border-r border-hairline bg-surface-1 p-2 text-xs font-semibold text-ink-secondary">
              区 / 氏名
            </div>
            {years.map((year) => (
              <div
                key={year}
                className="border-b border-hairline bg-surface-1 p-1 text-center text-xs text-ink-muted"
              >
                {year}
              </div>
            ))}
          </div>

          {[...rowsByWard.entries()].map(([ward, rows]) => (
            <details key={ward} className="border-b border-hairline last:border-b-0">
              <summary className="cursor-pointer bg-surface-page p-2 text-sm font-semibold text-ink-primary">
                {ward}({rows.length}名)
              </summary>
              <div className="grid" style={{ gridTemplateColumns: columns }}>
                {rows.map((row) => {
                  const legislator = row.legislatorId ? legislatorsById.get(row.legislatorId) : undefined;
                  return (
                    <div key={row.key} className="contents">
                      <div
                        style={{ gridColumn: 1 }}
                        className="sticky left-0 z-10 flex items-center gap-1.5 overflow-hidden border-t border-r border-hairline bg-surface-page p-1.5 text-sm text-ink-primary"
                      >
                        {legislator ? (
                          <Link
                            href={`/legislators/${legislator.id}`}
                            className="flex min-w-0 items-center gap-1.5 hover:underline"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full bg-series-1"
                              aria-hidden="true"
                              title="現職"
                            />
                            <span className="truncate">{row.displayName}</span>
                          </Link>
                        ) : (
                          <span className="truncate">{row.displayName}</span>
                        )}
                        {legislator?.currentFaction && (
                          <span className="shrink-0 truncate rounded-full border border-hairline bg-surface-1 px-1.5 py-0.5 text-[10px] text-ink-secondary">
                            {legislator.currentFaction.name}
                          </span>
                        )}
                      </div>
                      {row.terms.map((term) => (
                        <TermBar key={term.id} term={term} minYear={minYear} maxYear={maxYear} />
                      ))}
                    </div>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-full bg-series-1" aria-hidden="true" />
          当選による任期
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-full bg-series-1/50" aria-hidden="true" />
          繰上当選による任期
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-series-1" aria-hidden="true" />
          現職(会派とリンク先を表示)
        </span>
      </div>
    </div>
  );
}
