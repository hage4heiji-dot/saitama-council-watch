import type {
  Petition as PrismaPetition,
  PetitionIntroducer as PrismaPetitionIntroducer,
  PetitionStatus as PrismaPetitionStatus,
  PrismaClient,
} from "@prisma/client";
import type { Petition, PetitionStatus } from "@saitama-council-watch/shared-types";
import type { PetitionRepository, UpsertPetitionInput } from "../../../../domain/petition/PetitionRepository.js";

const PRISMA_TO_SHARED_STATUS: Record<PrismaPetitionStatus, PetitionStatus> = {
  PENDING: "pending",
  ADOPTED: "adopted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
  CARRIED_OVER: "carried_over",
  UNCONFIRMED: "unconfirmed",
};

const SHARED_TO_PRISMA_STATUS: Record<PetitionStatus, PrismaPetitionStatus> = {
  pending: "PENDING",
  adopted: "ADOPTED",
  rejected: "REJECTED",
  withdrawn: "WITHDRAWN",
  carried_over: "CARRIED_OVER",
  unconfirmed: "UNCONFIRMED",
};

type PrismaPetitionWithIntroducers = PrismaPetition & { introducers: PrismaPetitionIntroducer[] };

function toDomain(row: PrismaPetitionWithIntroducers): Petition {
  return {
    id: row.id,
    meetingId: row.meetingId,
    petitionNumber: row.petitionNumber,
    title: row.title,
    receivedDate: row.receivedDate ? row.receivedDate.toISOString().slice(0, 10) : null,
    petitionerName: row.petitionerName,
    committeeName: row.committeeName,
    summary: row.summary,
    status: PRISMA_TO_SHARED_STATUS[row.status],
    decidedDate: row.decidedDate ? row.decidedDate.toISOString().slice(0, 10) : null,
    sourceDocumentId: row.sourceDocumentId,
    introducers: row.introducers.map((introducer) => ({
      rawName: introducer.rawName,
      legislatorId: introducer.legislatorId,
    })),
  };
}

export class PrismaPetitionRepository implements PetitionRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertMany(inputs: UpsertPetitionInput[]): Promise<void> {
    for (const input of inputs) {
      const data = {
        title: input.title,
        receivedDate: input.receivedDate ? new Date(input.receivedDate) : null,
        petitionerName: input.petitionerName,
        committeeName: input.committeeName,
        summary: input.summary,
        status: SHARED_TO_PRISMA_STATUS[input.status],
        decidedDate: input.decidedDate ? new Date(input.decidedDate) : null,
        sourceDocumentId: input.sourceDocumentId,
      };

      const petition = await this.client.petition.upsert({
        where: {
          meetingId_petitionNumber: { meetingId: input.meetingId, petitionNumber: input.petitionNumber },
        },
        create: { meetingId: input.meetingId, petitionNumber: input.petitionNumber, ...data },
        update: data,
      });

      // 紹介議員は全件洗い替え(件数が少なく、差分更新の複雑さに見合わないためシンプルさを優先)
      await this.client.petitionIntroducer.deleteMany({ where: { petitionId: petition.id } });
      if (input.introducers.length > 0) {
        await this.client.petitionIntroducer.createMany({
          data: input.introducers.map((introducer) => ({
            petitionId: petition.id,
            rawName: introducer.rawName,
            legislatorId: introducer.legislatorId,
          })),
        });
      }
    }
  }

  async findAll(): Promise<Petition[]> {
    const rows = await this.client.petition.findMany({
      include: { introducers: true },
      orderBy: [{ receivedDate: "desc" }, { petitionNumber: "desc" }],
    });
    return rows.map(toDomain);
  }

  async findByMeetingId(meetingId: string): Promise<Petition[]> {
    const rows = await this.client.petition.findMany({
      where: { meetingId },
      include: { introducers: true },
    });
    return rows.map(toDomain);
  }

  async findByIntroducingLegislatorId(legislatorId: string): Promise<Petition[]> {
    const rows = await this.client.petition.findMany({
      where: { introducers: { some: { legislatorId } } },
      include: { introducers: true },
      orderBy: { receivedDate: "desc" },
    });
    return rows.map(toDomain);
  }

  async findPendingByPetitionNumber(petitionNumber: string): Promise<Petition[]> {
    const rows = await this.client.petition.findMany({
      where: { petitionNumber, status: "PENDING" },
      include: { introducers: true },
    });
    return rows.map(toDomain);
  }

  async updateResult(petitionId: string, status: PetitionStatus, decidedDate: string | null): Promise<void> {
    await this.client.petition.update({
      where: { id: petitionId },
      data: {
        status: SHARED_TO_PRISMA_STATUS[status],
        decidedDate: decidedDate ? new Date(decidedDate) : null,
      },
    });
  }
}
