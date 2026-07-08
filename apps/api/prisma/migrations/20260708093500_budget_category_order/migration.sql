-- 款番号(原本の表記通り)を保持し、表示順の並べ替えに使う(docs/adr/0024)。
-- budgetsテーブルは未使用(0件)のため、デフォルト値なしでNOT NULL列を追加できる。

ALTER TABLE "budgets" ADD COLUMN "category_order" INTEGER NOT NULL;
