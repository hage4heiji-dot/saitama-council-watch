import type { Bill as PrismaBill, BillStatus as PrismaBillStatus, PrismaClient } from "@prisma/client";
import type { Bill, BillStatus } from "@saitama-council-watch/shared-types";
import type { BillRepository, UpsertBillInput } from "../../../../domain/bill/BillRepository.js";
import type { Page, PageQuery } from "../../../../domain/shared/Page.js";

/** 他リポジトリ(投票クロス集計等)からも参照するためexportする */
export const PRISMA_TO_SHARED_STATUS: Record<PrismaBillStatus, BillStatus> = {
  SUBMITTED: "submitted",
  IN_DELIBERATION: "in_deliberation",
  PASSED: "passed",
  REJECTED: "rejected",
  CARRIED_OVER: "carried_over",
  UNCONFIRMED: "unconfirmed",
};

const SHARED_TO_PRISMA_STATUS: Record<BillStatus, PrismaBillStatus> = {
  submitted: "SUBMITTED",
  in_deliberation: "IN_DELIBERATION",
  passed: "PASSED",
  rejected: "REJECTED",
  carried_over: "CARRIED_OVER",
  unconfirmed: "UNCONFIRMED",
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

  async findPage(
    query: PageQuery & {
      meetingId?: string | undefined;
      status?: BillStatus | undefined;
      sourceDocumentIds?: string[] | undefined;
      sort?: "asc" | "desc" | undefined;
    },
  ): Promise<Page<Bill>> {
    const where = {
      ...(query.meetingId ? { meetingId: query.meetingId } : {}),
      ...(query.status ? { status: SHARED_TO_PRISMA_STATUS[query.status] } : {}),
      ...(query.sourceDocumentIds ? { sourceDocumentId: { in: query.sourceDocumentIds } } : {}),
    };
    const direction = query.sort ?? "desc";
    const rows = await this.client.bill.findMany({
      // idはUUID(挿入順・時系列と無関係)のため、これ単体でのソートは実質ランダムになる
      // (実データで発覚: 複数年度分の議案が混在した際に提出日の新しい順になっていなかった)。
      // 提出日順に並べ、同日タイの場合のみidで安定した順序にする。limit件で打ち切るため、
      // 「古い順」はクライアント側で配列を反転するのではなくDB側で逆順取得する必要がある
      // (そうしないと「直近limit件のうち古い方」になってしまい、本当の最古とズレる)。
      orderBy: [{ submittedDate: { sort: direction, nulls: "last" } }, { id: direction }],
      take: query.limit + 1,
      ...(Object.keys(where).length > 0 ? { where } : {}),
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
      orderBy: [{ submittedDate: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: limit,
    });
    return rows.map(toDomain);
  }

  async findBySourceDocumentId(sourceDocumentId: string): Promise<Bill | null> {
    const row = await this.client.bill.findFirst({ where: { sourceDocumentId } });
    return row ? toDomain(row) : null;
  }

  async findAllByMeetingId(meetingId: string): Promise<Bill[]> {
    const rows = await this.client.bill.findMany({ where: { meetingId }, orderBy: { billNumber: "asc" } });
    return rows.map(toDomain);
  }

  async findByTitleContaining(substring: string): Promise<Bill[]> {
    const rows = await this.client.bill.findMany({
      where: { title: { contains: substring } },
      orderBy: { submittedDate: "asc" },
    });
    return rows.map(toDomain);
  }

  async updateStatus(id: string, status: BillStatus): Promise<Bill | null> {
    // 対象が存在しない場合にPrismaが「レコードが見つからない」エラーをログ出力しないよう、
    // 事前にfindUniqueで存在確認する(PrismaMeetingRepository.updateSessionPeriodと同じ方針)。
    const existing = await this.client.bill.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }
    const row = await this.client.bill.update({
      where: { id },
      data: { status: SHARED_TO_PRISMA_STATUS[status] },
    });
    return toDomain(row);
  }
}
