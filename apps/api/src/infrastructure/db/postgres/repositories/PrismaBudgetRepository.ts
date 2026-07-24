import type { Budget as PrismaBudget, BudgetType as PrismaBudgetType, PrismaClient } from "@prisma/client";
import type { Budget, BudgetType } from "@saitama-council-watch/shared-types";
import type { BudgetRepository, UpsertBudgetInput } from "../../../../domain/budget/BudgetRepository.js";

const PRISMA_TO_SHARED_BUDGET_TYPE: Record<PrismaBudgetType, BudgetType> = {
  EXPENDITURE: "expenditure",
  REVENUE: "revenue",
};

const SHARED_TO_PRISMA_BUDGET_TYPE: Record<BudgetType, PrismaBudgetType> = {
  expenditure: "EXPENDITURE",
  revenue: "REVENUE",
};

function toDomain(row: PrismaBudget): Budget {
  return {
    id: row.id,
    fiscalYear: row.fiscalYear,
    accountName: row.accountName,
    category: row.category,
    budgetType: PRISMA_TO_SHARED_BUDGET_TYPE[row.budgetType],
    amount: Number(row.amount),
    relatedBillId: row.relatedBillId,
    description: row.description,
  };
}

export class PrismaBudgetRepository implements BudgetRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertMany(inputs: UpsertBudgetInput[]): Promise<void> {
    for (const input of inputs) {
      const budgetType = SHARED_TO_PRISMA_BUDGET_TYPE[input.budgetType];
      await this.client.budget.upsert({
        where: {
          fiscalYear_accountName_category_budgetType: {
            fiscalYear: input.fiscalYear,
            accountName: input.accountName,
            category: input.category,
            budgetType,
          },
        },
        create: {
          fiscalYear: input.fiscalYear,
          accountName: input.accountName,
          category: input.category,
          budgetType,
          categoryOrder: input.categoryOrder,
          amount: input.amountYen,
          relatedBillId: input.relatedBillId,
          description: input.description,
        },
        update: {
          categoryOrder: input.categoryOrder,
          amount: input.amountYen,
          relatedBillId: input.relatedBillId,
          description: input.description,
        },
      });
    }
  }

  async findByFiscalYear(fiscalYear: number): Promise<Budget[]> {
    const rows = await this.client.budget.findMany({
      where: { fiscalYear },
      orderBy: [{ accountName: "asc" }, { budgetType: "asc" }, { categoryOrder: "asc" }],
    });
    return rows.map(toDomain);
  }

  async findDistinctFiscalYears(): Promise<number[]> {
    const rows = await this.client.budget.findMany({
      distinct: ["fiscalYear"],
      select: { fiscalYear: true },
      orderBy: { fiscalYear: "desc" },
    });
    return rows.map((row) => row.fiscalYear);
  }
}
