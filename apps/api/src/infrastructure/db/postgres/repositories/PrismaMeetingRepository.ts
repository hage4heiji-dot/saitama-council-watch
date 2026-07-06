import type { Meeting as PrismaMeeting, MeetingType as PrismaMeetingType, PrismaClient } from "@prisma/client";
import type { Meeting, MeetingType } from "@saitama-council-watch/shared-types";
import type { MeetingRepository, UpsertMeetingInput } from "../../../../domain/meeting/MeetingRepository.js";

const PRISMA_TO_SHARED_TYPE: Record<PrismaMeetingType, MeetingType> = {
  PLENARY: "plenary",
  COMMITTEE: "committee",
};

const SHARED_TO_PRISMA_TYPE: Record<MeetingType, PrismaMeetingType> = {
  plenary: "PLENARY",
  committee: "COMMITTEE",
};

function toDomain(row: PrismaMeeting): Meeting {
  return {
    id: row.id,
    name: row.name,
    meetingType: PRISMA_TO_SHARED_TYPE[row.meetingType],
    sessionName: row.sessionName,
    date: row.date ? row.date.toISOString().slice(0, 10) : null,
    status: row.status === "SCHEDULED" ? "scheduled" : row.status === "HELD" ? "held" : "cancelled",
  };
}

export class PrismaMeetingRepository implements MeetingRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertBySessionNameAndType(input: UpsertMeetingInput): Promise<Meeting> {
    const meetingType = SHARED_TO_PRISMA_TYPE[input.meetingType];
    const row = await this.client.meeting.upsert({
      where: {
        sessionName_meetingType: {
          sessionName: input.sessionName,
          meetingType,
        },
      },
      create: {
        name: input.name,
        meetingType,
        sessionName: input.sessionName,
        date: input.date ? new Date(input.date) : null,
      },
      update: {
        name: input.name,
        ...(input.date ? { date: new Date(input.date) } : {}),
      },
    });
    return toDomain(row);
  }
}
