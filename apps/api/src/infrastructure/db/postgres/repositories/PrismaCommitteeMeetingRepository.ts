import type { CommitteeMeeting as PrismaCommitteeMeeting, PrismaClient } from "@prisma/client";
import type { CommitteeMeeting } from "@saitama-council-watch/shared-types";
import { extractCommitteeBaseName } from "../../../../domain/committeeMeeting/parseCommitteeCell.js";
import type {
  CommitteeMeetingRepository,
  UpsertCommitteeMeetingInput,
} from "../../../../domain/committeeMeeting/CommitteeMeetingRepository.js";

function toDomain(row: PrismaCommitteeMeeting): CommitteeMeeting {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    time: row.time,
    committeeName: row.committeeName,
    committeeBaseName: extractCommitteeBaseName(row.committeeName),
    meetingId: row.meetingId,
  };
}

export class PrismaCommitteeMeetingRepository implements CommitteeMeetingRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertMany(inputs: UpsertCommitteeMeetingInput[]): Promise<void> {
    for (const input of inputs) {
      await this.client.committeeMeeting.upsert({
        where: {
          date_committeeName: {
            date: new Date(input.date),
            committeeName: input.committeeName,
          },
        },
        create: {
          date: new Date(input.date),
          time: input.time,
          committeeName: input.committeeName,
          meetingId: input.meetingId,
        },
        update: {
          time: input.time,
          meetingId: input.meetingId,
        },
      });
    }
  }

  async findAll(): Promise<CommitteeMeeting[]> {
    const rows = await this.client.committeeMeeting.findMany({ orderBy: { date: "asc" } });
    return rows.map(toDomain);
  }
}
