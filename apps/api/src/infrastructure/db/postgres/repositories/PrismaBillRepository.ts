import type { Bill as PrismaBill, BillStatus as PrismaBillStatus, PrismaClient } from "@prisma/client";
import type { Bill, BillStatus } from "@saitama-council-watch/shared-types";
import type { BillRepository, UpsertBillInput } from "../../../../domain/bill/BillRepository.js";

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
}
