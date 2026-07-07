import type { Legislator, LegislatorDetail, LegislatorVoteRecord, VoteType } from "@saitama-council-watch/shared-types";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import type { LegislatorFactionHistoryEntry } from "../../domain/legislator/LegislatorRepository.js";
import type { VoteWithBillDetail } from "../../domain/vote/VoteRepository.js";

const EMPTY_SUMMARY: Record<VoteType, number> = { for: 0, against: 0, absent: 0, abstain: 0 };

/**
 * 議員詳細(活動記録)DTOを組み立てる(docs/adr/0020)。
 * 投票した議案ごとに原本URL・承認済みタグを併記し、「その人がどういった活動をしたのか」を
 * 判断できる形にする。タグは承認済み(is_verified=true)のもののみ(docs/adr/0007)。
 */
export async function buildLegislatorDetail(
  legislator: Legislator,
  factionHistory: LegislatorFactionHistoryEntry[],
  votes: VoteWithBillDetail[],
  documentRepository: DocumentRepository,
  tagsBySourceDocumentId: Map<string, string[]>,
): Promise<LegislatorDetail> {
  const voteRecords: LegislatorVoteRecord[] = await Promise.all(
    votes.map(async (vote): Promise<LegislatorVoteRecord> => {
      const document = await documentRepository.findById(vote.billSourceDocumentId);
      if (!document) {
        throw new Error(
          `Bill ${vote.billId} の sourceDocumentId(${vote.billSourceDocumentId}) に対応するDocumentが見つかりません`,
        );
      }
      return {
        billId: vote.billId,
        billNumber: vote.billNumber,
        billTitle: vote.billTitle,
        billStatus: vote.billStatus,
        sourceUrl: document.sourceUrl,
        tags: tagsBySourceDocumentId.get(vote.billSourceDocumentId) ?? [],
        voteType: vote.voteType,
        votedAt: vote.votedAt,
      };
    }),
  );

  const voteSummary = { ...EMPTY_SUMMARY };
  for (const record of voteRecords) {
    voteSummary[record.voteType] += 1;
  }

  return {
    ...legislator,
    factionHistory,
    voteSummary,
    voteRecords,
  };
}
