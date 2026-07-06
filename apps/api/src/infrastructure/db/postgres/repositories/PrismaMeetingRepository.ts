import type { Meeting as PrismaMeeting, MeetingType as PrismaMeetingType, PrismaClient } from "@prisma/client";
import type { Meeting, MeetingType } from "@saitama-council-watch/shared-types";
import type {
  MeetingRepository,
  SessionPeriod,
  UpsertMeetingInput,
} from "../../../../domain/meeting/MeetingRepository.js";

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
    startDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : null,
    endDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : null,
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
      },
      update: {
        name: input.name,
      },
    });
    return toDomain(row);
  }

  async updateSessionPeriod(
    sessionName: string,
    meetingType: MeetingType,
    period: SessionPeriod,
  ): Promise<Meeting | null> {
    const where = {
      sessionName_meetingType: {
        sessionName,
        meetingType: SHARED_TO_PRISMA_TYPE[meetingType],
      },
    };

    // 対応するMeetingがまだ存在しない(議案がまだスクレイピングされていない会期)場合はスキップする。
    // updateをそのまま呼ぶとPrismaが「レコードが見つからない」エラーをログ出力してしまうため、
    // 想定内の欠落であることを明示するために事前にfindUniqueで存在確認する。
    const existing = await this.client.meeting.findUnique({ where });
    if (!existing) {
      return null;
    }

    const row = await this.client.meeting.update({
      where,
      data: {
        startDate: new Date(period.startDate),
        endDate: new Date(period.endDate),
      },
    });
    return toDomain(row);
  }
}
