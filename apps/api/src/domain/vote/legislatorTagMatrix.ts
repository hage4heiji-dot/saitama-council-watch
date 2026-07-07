import type { BillStatus } from "@saitama-council-watch/shared-types";
import type { VoteWithBillInfo } from "./VoteRepository.js";

export interface LegislatorTagCell {
  for: number;
  against: number;
}

export interface LegislatorTagMatrixRow {
  legislatorId: string;
  legislatorName: string;
  factionName: string | null;
  cellsByTag: Record<string, LegislatorTagCell>;
}

export interface LegislatorTagMatrix {
  tags: string[];
  rows: LegislatorTagMatrixRow[];
}

/**
 * 議員×タグのクロス集計(docs/adr/0019)。議員が「そのタグを持つ議案」に対して
 * 賛成・反対した件数を集計する。statusFilterを指定すると、その可決状態の
 * 議案のみを対象にする(例: 可決した議案だけで見る)。meetingIdFilterを指定すると、
 * その会期(定例会・臨時会)の議案のみを対象にする(期間の絞り込み、docs/adr/0021)。
 *
 * タグが1つも確定していない(未承認/未生成)議案は集計対象から除外する
 * (捏造しない。docs/adr/0007)。投票記録が1件もない議員は結果に含めない
 * (全会派・全議員を機械的に列挙するより、実データがある行だけを見せる方が
 * 「まだデータが無い」ことが分かりやすいと判断した)。
 */
export function buildLegislatorTagMatrix(
  votes: VoteWithBillInfo[],
  tagsBySourceDocumentId: Map<string, string[]>,
  statusFilter?: BillStatus,
  meetingIdFilter?: string,
): LegislatorTagMatrix {
  const filteredVotes = votes
    .filter((vote) => !statusFilter || vote.billStatus === statusFilter)
    .filter((vote) => !meetingIdFilter || vote.billMeetingId === meetingIdFilter);

  const allTags = new Set<string>();
  const rowsByLegislator = new Map<string, LegislatorTagMatrixRow>();

  for (const vote of filteredVotes) {
    const tags = tagsBySourceDocumentId.get(vote.billSourceDocumentId) ?? [];
    if (tags.length === 0) {
      continue;
    }

    let row = rowsByLegislator.get(vote.legislatorId);
    if (!row) {
      row = {
        legislatorId: vote.legislatorId,
        legislatorName: vote.legislatorName,
        factionName: vote.factionName,
        cellsByTag: {},
      };
      rowsByLegislator.set(vote.legislatorId, row);
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

  const rows = [...rowsByLegislator.values()].sort((a, b) =>
    a.legislatorName.localeCompare(b.legislatorName, "ja"),
  );
  const tags = [...allTags].sort((a, b) => a.localeCompare(b, "ja"));

  return { tags, rows };
}
