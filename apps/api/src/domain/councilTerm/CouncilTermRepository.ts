import type { CouncilTerm } from "@saitama-council-watch/shared-types";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertCouncilTermInput {
  origin: "election" | "runner_up_succession";
  electionKind: "regular" | "by_election" | null;
  electionDate: string | null;
  ward: string;
  candidateRawName: string;
  partyRawName: string | null;
  electedRank: number | null;
  voteCount: number | null;
  termStartDate: string;
  termStartDateBasis: "explicit" | "assumed";
  termEndDate: string | null;
  termEndDateBasis: "explicit" | "assumed" | null;
  resignedDate: string | null;
  successorRawName: string | null;
  predecessorRawName: string | null;
  legislatorId: string | null;
  sourceDocumentId: string;
}

export interface CouncilTermRepository {
  /** (ward, candidateRawName, termStartDate)で冪等にupsertする(再実行安全) */
  upsertMany(inputs: UpsertCouncilTermInput[]): Promise<number>;
  findAll(): Promise<CouncilTerm[]>;
}
