import type { BillRepository } from "../../domain/bill/BillRepository.js";
import type { LegislatorRepository } from "../../domain/legislator/LegislatorRepository.js";
import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
import { parseVoteStancePdf } from "../../domain/vote/voteStanceParsing.js";
import type { VoteRepository } from "../../domain/vote/VoteRepository.js";
import { extractPositionedPdfText } from "../../infrastructure/documentText/extractPositionedPdfText.js";
import { eraYearToSeireki, pad2, parseSessionCore } from "../../infrastructure/scraper/eraDate.js";
import { fetchVoteStancePdf } from "../../infrastructure/scraper/saitamaVoteStanceScraper.js";

export interface SyncBillVotesDeps {
  meetingRepository: MeetingRepository;
  billRepository: BillRepository;
  legislatorRepository: LegislatorRepository;
  voteRepository: VoteRepository;
  /** 「会期が終了しているか」の判定基準時刻 */
  now: Date;
}

export interface SyncBillVotesResult {
  meetingsProcessed: number;
  votesUpserted: number;
}

/**
 * 会期終了後の議案について、さいたま市議会サイトが公開する
 * 「議案に対する表決態度」PDFから議員ごとの賛否をVoteへ反映する(docs/adr/0017)。
 *
 * 会派の記号を所属議員全員の基本の議決とし、欠席・退席・除斥等の個別注記がある
 * 議員のみ上書きする(domain/vote/voteStanceParsing.ts)。原本からPDFがまだ
 * 公開されていない会期は静かにスキップする(捏造しない・パイプラインを止めない)。
 */
export async function syncBillVotes(deps: SyncBillVotesDeps): Promise<SyncBillVotesResult> {
  const meetings = await deps.meetingRepository.findConcludedPlenarySessions(deps.now);
  const legislators = await deps.legislatorRepository.findAll();
  const knownLegislators = legislators.map((legislator) => ({ id: legislator.id, name: legislator.name }));

  let meetingsProcessed = 0;
  let votesUpserted = 0;

  for (const meeting of meetings) {
    const sessionCore = parseSessionCore(meeting.sessionName);
    if (!sessionCore) {
      continue;
    }

    const bills = await deps.billRepository.findAllByMeetingId(meeting.id);
    if (bills.length === 0) {
      continue;
    }

    if (await deps.voteRepository.existsForAnyBill(bills.map((bill) => bill.id))) {
      // 既にこの会期の投票記録が存在する場合、再スクレイピングの必要はない
      continue;
    }

    const pdfBuffer = await fetchVoteStancePdf(sessionCore.core);
    if (!pdfBuffer) {
      // まだ表決態度PDFが公開されていない会期はスキップする
      continue;
    }

    const positionedItems = await extractPositionedPdfText(pdfBuffer);
    const billVoteResults = parseVoteStancePdf(positionedItems, knownLegislators);
    const billIdByNumber = new Map(bills.map((bill) => [bill.billNumber, bill.id]));
    const calendarYear = eraYearToSeireki(sessionCore.era, sessionCore.eraYear);

    const upserts: { billId: string; legislatorId: string; voteType: (typeof billVoteResults)[number]["votes"][number]["voteType"]; votedAt: Date }[] =
      [];
    for (const billVoteResult of billVoteResults) {
      const billId = billIdByNumber.get(billVoteResult.billNumber);
      if (!billId || !billVoteResult.decidedOn) {
        continue;
      }
      const votedAt = new Date(
        `${calendarYear}-${pad2(billVoteResult.decidedOn.month)}-${pad2(billVoteResult.decidedOn.day)}T00:00:00Z`,
      );
      for (const vote of billVoteResult.votes) {
        upserts.push({ billId, legislatorId: vote.legislatorId, voteType: vote.voteType, votedAt });
      }
    }

    if (upserts.length > 0) {
      await deps.voteRepository.upsertMany(upserts);
      votesUpserted += upserts.length;
    }
    meetingsProcessed += 1;
  }

  return { meetingsProcessed, votesUpserted };
}
