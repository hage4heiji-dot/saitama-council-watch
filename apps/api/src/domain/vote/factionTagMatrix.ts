import type { BillStatus } from "@saitama-council-watch/shared-types";
import type { VoteWithBillInfo } from "./VoteRepository.js";

export interface FactionTagCell {
  for: number;
  against: number;
}

export interface FactionTagMatrixRow {
  factionName: string;
  cellsByTag: Record<string, FactionTagCell>;
}

export interface FactionTagMatrix {
  tags: string[];
  rows: FactionTagMatrixRow[];
}

/**
 * 会派×タグのクロス集計(docs/adr/0022)。議員×タグ(buildLegislatorTagMatrix、
 * docs/adr/0019)と同じ絞り込み軸(status/meetingId)・除外方針(タグ未確定議案の除外、
 * 捏造しない。docs/adr/0007)だが、行を会派単位でロールアップする。
 * 無所属・会派不明の議員はまとめて「無所属」行にする。
 */
export function buildFactionTagMatrix(
  votes: VoteWithBillInfo[],
  tagsBySourceDocumentId: Map<string, string[]>,
  statusFilter?: BillStatus,
  meetingIdFilter?: string,
): FactionTagMatrix {
  const filteredVotes = votes
    .filter((vote) => !statusFilter || vote.billStatus === statusFilter)
    .filter((vote) => !meetingIdFilter || vote.billMeetingId === meetingIdFilter);

  const allTags = new Set<string>();
  const rowsByFaction = new Map<string, FactionTagMatrixRow>();

  for (const vote of filteredVotes) {
    const tags = tagsBySourceDocumentId.get(vote.billSourceDocumentId) ?? [];
    if (tags.length === 0) {
      continue;
    }

    const factionName = vote.factionName ?? "無所属";
    let row = rowsByFaction.get(factionName);
    if (!row) {
      row = { factionName, cellsByTag: {} };
      rowsByFaction.set(factionName, row);
    }

    for (const tag of tags) {
      allTags.add(tag);
      const cell = row.cellsByTag[tag] ?? { for: 0, against: 0 };
      if (vote.voteType === "for") {
        cell.for += 1;
      } else if (vote.voteType === "against") {
        cell.against += 1;
      }
      row.cellsByTag[tag] = cell;
    }
  }

  const rows = [...rowsByFaction.values()].sort((a, b) => a.factionName.localeCompare(b.factionName, "ja"));
  const tags = [...allTags].sort((a, b) => a.localeCompare(b, "ja"));

  return { tags, rows };
}
