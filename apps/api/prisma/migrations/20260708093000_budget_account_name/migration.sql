-- 予算(Budget)に会計名(accountName)を追加し、(fiscal_year, account_name, category)を一意にする。
-- 特別会計ごとに款名(例:「総務費」)が重複しうるため、会計を区別する列が必要(docs/adr/0024)。
-- budgetsテーブルは未使用(0件)のため、デフォルト値なしでNOT NULL列を追加できる。

DROP INDEX "budgets_fiscal_year_idx";

ALTER TABLE "budgets" ADD COLUMN "account_name" TEXT NOT NULL;

CREATE UNIQUE INDEX "budgets_fiscal_year_account_name_category_key" ON "budgets"("fiscal_year", "account_name", "category");
