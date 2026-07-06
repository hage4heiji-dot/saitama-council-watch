import type { Bill as PrismaBill, BillStatus as PrismaBillStatus, PrismaClient } from "@prisma/client";
import type { Bill, BillStatus } from "@saitama-council-watch/shared-types";
import type { BillRepository, UpsertBillInput } from "../../../../domain/bill/BillRepository.js";
import type { Page, PageQuery } from "../../../../domain/shared/Page.js";

const PRISMA_TO_SHARED_STATUS: Record<PrismaBillStatus, BillStatus> = {
  SUBMITTED: "submitted",
  IN_DELIBERATION: "in_deliberation",
  PASSED: "passed",
  REJECTED: "rejected",
  CARRIED_OVER: "carried_over",
};

function toDomain(row: PrismaBill): Bill {
  return {
    id: row.id,
    meetingId: row.meetingId,
    billNumber: row.billNumber,
    title: row.title,
    category: row.category,
    submittedDate: row.submittedDate ? row.submittedDate.toISOString().slice(0, 10) : null,
    status: PRISMA_TO_SHARED_STATUS[row.status],
    sourceDocumentId: row.sourceDocumentId,
  };
}

export class PrismaBillRepository implements BillRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertByMeetingAndNumber(input: UpsertBillInput): Promise<Bill> {
    const row = await this.client.bill.upsert({
      where: {
        meetingId_billNumber: {
          meetingId: input.meetingId,
          billNumber: input.billNumber,
        },
      },
      create: {
        meetingId: input.meetingId,
        billNumber: input.billNumber,
        title: input.title,
        category: input.category,
        submittedDate: input.submittedDate ? new Date(input.submittedDate) : null,
        sourceDocumentId: input.sourceDocumentId,
      },
      update: {
        title: input.title,
        category: input.category,
        ...(input.submittedDate ? { submittedDate: new Date(input.submittedDate) } : {}),
        sourceDocumentId: input.sourceDocumentId,
      },
    });
    return toDomain(row);
  }

  async findPage(query: PageQuery & { meetingId?: string | undefined }): Promise<Page<Bill>> {
    const rows = await this.client.bill.findMany({
      orderBy: { id: "desc" },
      take: query.limit + 1,
      ...(query.meetingId ? { where: { meetingId: query.meetingId } } : {}),
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const lastItem = items[items.length - 1];
    return {
      items: items.map(toDomain),
      nextCursor: hasMore && lastItem ? lastItem.id : null,
    };
  }

  async findManyByIds(ids: string[]): Promise<Bill[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.client.bill.findMany({ where: { id: { in: ids } } });
    return rows.map(toDomain);
  }

  async findWithoutAiContent(limit: number): Promise<Bill[]> {
    const rows = await this.client.bill.findMany({
      where: { sourceDocument: { aiContents: { none: {} } } },
      orderBy: { id: "desc" },
      take: limit,
    });
    return rows.map(toDomain);
  }

  async findBySourceDocumentId(sourceDocumentId: string): Promise<Bill | null> {
    const row = await this.client.bill.findFirst({ where: { sourceDocumentId } });
    return row ? toDomain(row) : null;
  }
}
