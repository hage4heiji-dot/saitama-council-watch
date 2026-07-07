import type { PrismaClient, VoteType as PrismaVoteType } from "@prisma/client";
import type { VoteType, VoteWithLegislator } from "@saitama-council-watch/shared-types";
import type {
  UpsertVoteInput,
  VoteRepository,
  VoteWithBillDetail,
  VoteWithBillInfo,
} from "../../../../domain/vote/VoteRepository.js";
import { PRISMA_TO_SHARED_STATUS } from "./PrismaBillRepository.js";

const SHARED_TO_PRISMA_VOTE_TYPE: Record<VoteType, PrismaVoteType> = {
  for: "FOR",
  against: "AGAINST",
  absent: "ABSENT",
  abstain: "ABSTAIN",
};

const PRISMA_TO_SHARED_VOTE_TYPE: Record<PrismaVoteType, VoteType> = {
  FOR: "for",
  AGAINST: "against",
  ABSENT: "absent",
  ABSTAIN: "abstain",
};

export class PrismaVoteRepository implements VoteRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertMany(inputs: UpsertVoteInput[]): Promise<void> {
    for (const input of inputs) {
      await this.client.vote.upsert({
        where: {
          billId_legislatorId: {
            billId: input.billId,
            legislatorId: input.legislatorId,
          },
        },
        create: {
          billId: input.billId,
          legislatorId: input.legislatorId,
          voteType: SHARED_TO_PRISMA_VOTE_TYPE[input.voteType],
          votedAt: input.votedAt,
        },
        update: {
          voteType: SHARED_TO_PRISMA_VOTE_TYPE[input.voteType],
          votedAt: input.votedAt,
        },
      });
    }
  }

  async existsForAnyBill(billIds: string[]): Promise<boolean> {
    if (billIds.length === 0) {
      return false;
    }
    const existing = await this.client.vote.findFirst({ where: { billId: { in: billIds } } });
    return existing !== null;
  }

  async findByBillId(billId: string): Promise<VoteWithLegislator[]> {
    const rows = await this.client.vote.findMany({
      where: { billId },
      include: {
        legislator: {
          include: {
            factionHistory: { where: { validTo: null }, include: { faction: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      legislatorId: row.legislatorId,
      legislatorName: row.legislator.name,
      factionName: row.legislator.factionHistory[0]?.faction.name ?? null,
      voteType: PRISMA_TO_SHARED_VOTE_TYPE[row.voteType],
    }));
  }

  async findAllWithBillInfo(): Promise<VoteWithBillInfo[]> {
    const rows = await this.client.vote.findMany({
      include: {
        legislator: {
          include: {
            factionHistory: { where: { validTo: null }, include: { faction: true } },
          },
        },
        bill: true,
      },
    });
    return rows.map((row) => ({
      legislatorId: row.legislatorId,
      legislatorName: row.legislator.name,
      factionName: row.legislator.factionHistory[0]?.faction.name ?? null,
      billId: row.billId,
      billSourceDocumentId: row.bill.sourceDocumentId,
      billStatus: PRISMA_TO_SHARED_STATUS[row.bill.status],
      billMeetingId: row.bill.meetingId,
      voteType: PRISMA_TO_SHARED_VOTE_TYPE[row.voteType],
    }));
  }

  async findByLegislatorId(legislatorId: string): Promise<VoteWithBillDetail[]> {
    const rows = await this.client.vote.findMany({
      where: { legislatorId },
      include: { bill: true },
      orderBy: { votedAt: "desc" },
    });
    return rows.map((row) => ({
      billId: row.billId,
      billNumber: row.bill.billNumber,
      billTitle: row.bill.title,
      billStatus: PRISMA_TO_SHARED_STATUS[row.bill.status],
      billSourceDocumentId: row.bill.sourceDocumentId,
      voteType: PRISMA_TO_SHARED_VOTE_TYPE[row.voteType],
      votedAt: row.votedAt.toISOString().slice(0, 10),
    }));
  }
}
