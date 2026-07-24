import Link from "next/link";
import { fetchBudgetFiscalYears, fetchBudgets } from "@/lib/apiClient";

export const metadata = { title: "予算(歳出・歳入内訳) | さいたま市議会ウォッチ" };

type BudgetType = "expenditure" | "revenue";

interface BudgetPageProps {
  searchParams: Promise<{ fiscalYear?: string; account?: string; type?: string; sort?: string }>;
}

function formatOku(amountYen: number): string {
  const oku = amountYen / 100_000_000;
  return `${oku.toLocaleString("ja-JP", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}億円`;
}

function hrefFor(options: {
  fiscalYear: number;
  account: string | undefined;
  type: BudgetType;
  ascending: boolean;
}): string {
  const params = new URLSearchParams({ fiscalYear: String(options.fiscalYear) });
  if (options.account) {
    params.set("account", options.account);
  }
  if (options.type === "revenue") {
    params.set("type", "revenue");
  }
  if (options.ascending) {
    params.set("sort", "asc");
  }
  return `/budget?${params.toString()}`;
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const { fiscalYear: rawFiscalYear, account: rawAccount, type: rawType, sort: rawSort } = await searchParams;

  const { items: fiscalYears } = await fetchBudgetFiscalYears();
  const fiscalYear =
    rawFiscalYear && fiscalYears.includes(Number(rawFiscalYear)) ? Number(rawFiscalYear) : fiscalYears[0];
  const budgetType: BudgetType = rawType === "revenue" ? "revenue" : "expenditure";
  const ascending = rawSort === "asc";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">予算({budgetType === "revenue" ? "歳入" : "歳出"}内訳)</h1>
      <p className="mb-6 text-sm text-ink-muted">
        議決された予算議案(当初予算・補正予算)から、{budgetType === "revenue" ? "歳入" : "歳出"}
        の款別内訳を集計したものです。補正予算は変更のあった款のみが議案化されるため、変更のない款は当初予算の金額のままになります。公営企業会計(水道・下水道・病院事業会計)は表の形式が異なるため対象外です。
      </p>

      {fiscalYear === undefined ? (
        <p className="text-ink-muted">予算データがまだありません。</p>
      ) : (
        <BudgetByYear
          fiscalYears={fiscalYears}
          fiscalYear={fiscalYear}
          rawAccount={rawAccount}
          budgetType={budgetType}
          ascending={ascending}
        />
      )}
    </main>
  );
}

async function BudgetByYear({
  fiscalYears,
  fiscalYear,
  rawAccount,
  budgetType,
  ascending,
}: {
  fiscalYears: number[];
  fiscalYear: number;
  rawAccount: string | undefined;
  budgetType: BudgetType;
  ascending: boolean;
}) {
  const { items: budgets } = await fetchBudgets(fiscalYear);
  const accountNames = [...new Set(budgets.map((b) => b.accountName))].sort((a, b) => a.localeCompare(b, "ja"));
  const account =
    rawAccount && accountNames.includes(rawAccount)
      ? rawAccount
      : (accountNames.find((name) => name === "一般会計") ?? accountNames[0]);

  const categories = budgets
    .filter((b) => b.accountName === account && b.budgetType === budgetType)
    .sort((a, b) => (ascending ? a.amount - b.amount : b.amount - a.amount));
  const maxAmount = Math.max(...categories.map((c) => c.amount), 1);

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {(["expenditure", "revenue"] as const).map((type) => (
          <Link
            key={type}
            href={hrefFor({ fiscalYear, account, type, ascending })}
            className={`rounded-full border border-hairline px-3 py-1 ${
              type === budgetType ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"
            }`}
          >
            {type === "revenue" ? "歳入" : "歳出"}
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {fiscalYears.map((year) => (
          <Link
            key={year}
            href={hrefFor({ fiscalYear: year, account, type: budgetType, ascending })}
            className={`rounded-full border border-hairline px-3 py-1 ${
              year === fiscalYear ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"
            }`}
          >
            {year}年度
          </Link>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {accountNames.map((name) => (
          <Link
            key={name}
            href={hrefFor({ fiscalYear, account: name, type: budgetType, ascending })}
            className={`rounded-full border border-hairline px-3 py-1 ${
              name === account ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"
            }`}
          >
            {name}
          </Link>
        ))}
      </div>

      <div className="mb-6 flex gap-2 text-sm">
        <Link
          href={hrefFor({ fiscalYear, account, type: budgetType, ascending: false })}
          className={`rounded-full border border-hairline px-3 py-1 ${!ascending ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          金額が多い順
        </Link>
        <Link
          href={hrefFor({ fiscalYear, account, type: budgetType, ascending: true })}
          className={`rounded-full border border-hairline px-3 py-1 ${ascending ? "bg-ink-primary text-surface-page" : "bg-surface-1 hover:bg-surface-page"}`}
        >
          金額が少ない順
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="text-ink-muted">この年度・会計の予算データがまだありません。</p>
      ) : (
        <ul className="space-y-4">
          {categories.map((c) => (
            <li key={c.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-ink-primary">{c.category}</span>
                <span className="text-ink-secondary" title={`${c.amount.toLocaleString("ja-JP")}円`}>
                  {formatOku(c.amount)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-surface-1">
                <div
                  className="h-2 rounded-full bg-sequential-450"
                  style={{ width: `${Math.max((c.amount / maxAmount) * 100, 1)}%` }}
                />
              </div>
              {c.description && <p className="mt-1 text-xs text-ink-muted">{c.description}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
