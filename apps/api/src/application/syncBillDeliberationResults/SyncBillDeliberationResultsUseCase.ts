import type { BillStatus } from "@saitama-council-watch/shared-types";
import type { BillRepository } from "../../domain/bill/BillRepository.js";
import { mapDeliberationResultToStatus, parseDeliberationResultText } from "../../domain/bill/deliberationResult.js";
import type { MeetingRepository } from "../../domain/meeting/MeetingRepository.js";
import { extractPdfTextFromBuffer } from "../../infrastructure/documentText/extractPdfText.js";
import { parseSessionCore } from "../../infrastructure/scraper/eraDate.js";
import { fetchDeliberationResultDocuments } from "../../infrastructure/scraper/saitamaDeliberationResultsScraper.js";

export interface SyncBillDeliberationResultsDeps {
  meetingRepository: MeetingRepository;
  billRepository: BillRepository;
  /** 「会期が終了しているか」の判定基準時刻。呼び出し側から注入する(テスト容易性のため) */
  now: Date;
}

export interface SyncBillDeliberationResultsResult {
  meetingsProcessed: number;
  billsUpdated: number;
  billsMarkedUnconfirmed: number;
}

const CONFIRMED_STATUSES: ReadonlySet<BillStatus> = new Set(["passed", "rejected", "carried_over"]);

/**
 * 会期終了後の議案について、資料検索システム(Discuss Cabinet)が公開する
 * 委員会審査結果報告・議案審議結果一覧から実際の審議結果をBill.statusへ反映する
 * (docs/adr/0016)。
 *
 * 原本から結果を特定できなかった議案は、捏造を避けるため「提出」のまま放置せず
 * 明示的に unconfirmed(詳細要確認) にする。一方、既に確定済み(passed/rejected/
 * carried_over)のステータスは、たまたま今回の原本に見当たらなかったという理由だけで
 * unconfirmedへ後退させない(確認済みの事実を消さない)。
 */
export async function syncBillDeliberationResults(
  deps: SyncBillDeliberationResultsDeps,
): Promise<SyncBillDeliberationResultsResult> {
  const meetings = await deps.meetingRepository.findConcludedPlenarySessions(deps.now);

  let meetingsProcessed = 0;
  let billsUpdated = 0;
  let billsMarkedUnconfirmed = 0;

  for (const meeting of meetings) {
    const sessionCore = parseSessionCore(meeting.sessionName);
    if (!sessionCore) {
      // 会期名の書式が解析できない(想定外)場合は捏造を避けてスキップする
      continue;
    }

    const bills = await deps.billRepository.findAllByMeetingId(meeting.id);
    const hasUnsettledBill = bills.some(
      (bill) => bill.status === "submitted" || bill.status === "in_deliberation",
    );
    if (!hasUnsettledBill) {
      // 全議案が確定済み(またはunconfirmed)であれば、再スクレイピングの必要はない
      continue;
    }

    let documents;
    try {
      documents = await fetchDeliberationResultDocuments({
        era: sessionCore.era,
        eraYear: sessionCore.eraYear,
        month: sessionCore.month,
        sessionKind: sessionCore.sessionKind,
      });
    } catch (error) {
      console.error(`sync-bill-deliberation-results: ${meeting.sessionName} の取得に失敗しました`, error);
      continue;
    }
    meetingsProcessed += 1;

    const resultTextByBillNumber = new Map<string, string>();
    for (const document of documents) {
      const text = await extractPdfTextFromBuffer(document.pdfBuffer);
      const items = parseDeliberationResultText(text, document.format);
      for (const item of items) {
        if (item.kind !== "議案") {
          continue; // 請願は本アプリのBillとして管理していないため対象外
        }
        resultTextByBillNumber.set(item.billNumber, item.resultText);
      }
    }

    for (const bill of bills) {
      const resultText = resultTextByBillNumber.get(bill.billNumber);
      const newStatus: BillStatus = resultText ? (mapDeliberationResultToStatus(resultText) ?? "unconfirmed") : "unconfirmed";

      if (newStatus === bill.status) {
        continue;
      }
      if (newStatus === "unconfirmed" && CONFIRMED_STATUSES.has(bill.status)) {
        continue;
      }

      await deps.billRepository.updateStatus(bill.id, newStatus);
      if (newStatus === "unconfirmed") {
        billsMarkedUnconfirmed += 1;
      } else {
        billsUpdated += 1;
      }
    }
  }

  return { meetingsProcessed, billsUpdated, billsMarkedUnconfirmed };
}
