import type { Budget as PrismaBudget, PrismaClient } from "@prisma/client";
import type { Budget } from "@saitama-council-watch/shared-types";
import type { BudgetRepository, UpsertBudgetInput } from "../../../../domain/budget/BudgetRepository.js";

function toDomain(row: PrismaBudget): Budget {
  return {
    id: row.id,
    fiscalYear: row.fiscalYear,
    accountName: row.accountName,
    category: row.category,
    amount: Number(row.amount),
    relatedBillId: row.relatedBillId,
    description: row.description,
  };
}

export class PrismaBudgetRepository implements BudgetRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertMany(inputs: UpsertBudgetInput[]): Promise<void> {
    for (const input of inputs) {
      await this.client.budget.upsert({
        where: {
          fiscalYear_accountName_category: {
            fiscalYear: input.fiscalYear,
            accountName: input.accountName,
            category: input.category,
          },
        },
        create: {
          fiscalYear: input.fiscalYear,
          accountName: input.accountName,
          category: input.category,
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
      orderBy: [{ accountName: "asc" }, { categoryOrder: "asc" }],
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
