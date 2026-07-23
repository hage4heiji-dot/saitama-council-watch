import type { CouncilTerm as PrismaCouncilTerm, PrismaClient } from "@prisma/client";
import type { CouncilTerm } from "@saitama-council-watch/shared-types";
import type { CouncilTermRepository, UpsertCouncilTermInput } from "../../../../domain/councilTerm/CouncilTermRepository.js";

function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function toDomain(row: PrismaCouncilTerm): CouncilTerm {
  return {
    id: row.id,
    origin: row.origin === "ELECTION" ? "election" : "runner_up_succession",
    electionKind: row.electionKind === "REGULAR" ? "regular" : row.electionKind === "BY_ELECTION" ? "by_election" : null,
    electionDate: toIsoDate(row.electionDate),
    ward: row.ward,
    candidateName: row.candidateRawName,
    partyName: row.partyRawName,
    electedRank: row.electedRank,
    voteCount: row.voteCount ? Number(row.voteCount) : null,
    termStartDate: toIsoDate(row.termStartDate)!,
    termStartDateBasis: row.termStartDateBasis === "EXPLICIT" ? "explicit" : "assumed",
    termEndDate: toIsoDate(row.termEndDate),
    termEndDateBasis:
      row.termEndDateBasis === "EXPLICIT" ? "explicit" : row.termEndDateBasis === "ASSUMED" ? "assumed" : null,
    resignedDate: toIsoDate(row.resignedDate),
    legislatorId: row.legislatorId,
  };
}

export class PrismaCouncilTermRepository implements CouncilTermRepository {
  constructor(private readonly client: PrismaClient) {}

  async upsertMany(inputs: UpsertCouncilTermInput[]): Promise<number> {
    let count = 0;
    for (const input of inputs) {
      await this.client.councilTerm.upsert({
        where: {
          ward_candidateRawName_termStartDate: {
            ward: input.ward,
            candidateRawName: input.candidateRawName,
            termStartDate: new Date(input.termStartDate),
          },
        },
        create: {
          origin: input.origin === "election" ? "ELECTION" : "RUNNER_UP_SUCCESSION",
          electionKind: input.electionKind === "regular" ? "REGULAR" : input.electionKind === "by_election" ? "BY_ELECTION" : null,
          electionDate: input.electionDate ? new Date(input.electionDate) : null,
          ward: input.ward,
          candidateRawName: input.candidateRawName,
          partyRawName: input.partyRawName,
          electedRank: input.electedRank,
          voteCount: input.voteCount,
          termStartDate: new Date(input.termStartDate),
          termStartDateBasis: input.termStartDateBasis === "explicit" ? "EXPLICIT" : "ASSUMED",
          termEndDate: input.termEndDate ? new Date(input.termEndDate) : null,
          termEndDateBasis: input.termEndDateBasis === "explicit" ? "EXPLICIT" : input.termEndDateBasis === "assumed" ? "ASSUMED" : null,
          resignedDate: input.resignedDate ? new Date(input.resignedDate) : null,
          successorRawName: input.successorRawName,
          predecessorRawName: input.predecessorRawName,
          legislatorId: input.legislatorId,
          sourceDocumentId: input.sourceDocumentId,
        },
        update: {
          partyRawName: input.partyRawName,
          electedRank: input.electedRank,
          voteCount: input.voteCount,
          termEndDate: input.termEndDate ? new Date(input.termEndDate) : null,
          termEndDateBasis: input.termEndDateBasis === "explicit" ? "EXPLICIT" : input.termEndDateBasis === "assumed" ? "ASSUMED" : null,
          resignedDate: input.resignedDate ? new Date(input.resignedDate) : null,
          successorRawName: input.successorRawName,
          predecessorRawName: input.predecessorRawName,
          legislatorId: input.legislatorId,
        },
      });
      count++;
    }
    return count;
  }

  async findAll(): Promise<CouncilTerm[]> {
    const rows = await this.client.councilTerm.findMany({
      orderBy: [{ termStartDate: "desc" }],
    });
    return rows.map(toDomain);
  }
}
