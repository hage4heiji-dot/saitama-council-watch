import type { Budget } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertBudgetInput {
  fiscalYear: number;
  accountName: string;
  category: string;
  /** 款番号(原本の表記通り。表示順の並べ替えに使う) */
  categoryOrder: number;
  /** 円単位(docs/adr/0024。原本は千円単位だが1000倍して保持する) */
  amountYen: number;
  relatedBillId: string;
  description: string;
}

export interface BudgetRepository {
  /** (fiscalYear, accountName, category)の一意制約によりupsertする */
  upsertMany(inputs: UpsertBudgetInput[]): Promise<void>;
  /** 予算画面向け。指定した会計年度の歳出内訳を款番号順に返す */
  findByFiscalYear(fiscalYear: number): Promise<Budget[]>;
  /** 年度セレクタ向け。データのある会計年度の一覧を降順で返す */
  findDistinctFiscalYears(): Promise<number[]>;
}
