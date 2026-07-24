-- 歳出(支出)/歳入(収入)の別を追加する(docs/adr/0028)。
-- 先行する2つのBudgetマイグレーションと異なり、budgetsテーブルには
-- ingest-expenditure-budgetにより既に投入済みの本番データが存在するため、
-- デフォルト値付きで追加し既存行をEXPENDITUREとしてバックフィルする。

CREATE TYPE "BudgetType" AS ENUM ('EXPENDITURE', 'REVENUE');

ALTER TABLE "budgets" ADD COLUMN "budget_type" "BudgetType" NOT NULL DEFAULT 'EXPENDITURE';

DROP INDEX "budgets_fiscal_year_account_name_category_key";

CREATE UNIQUE INDEX "budgets_fiscal_year_account_name_category_budget_type_key"
  ON "budgets"("fiscal_year", "account_name", "category", "budget_type");
