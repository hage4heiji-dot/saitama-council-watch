import type { BillRepository } from "../../domain/bill/BillRepository.js";
import { aggregateExpenditureBudget, type BudgetBillInput } from "../../domain/budget/budgetAggregation.js";
import { classifyBudgetBillTitle } from "../../domain/budget/budgetBillClassification.js";
import type { BudgetRepository, UpsertBudgetInput } from "../../domain/budget/BudgetRepository.js";
import { parseExpenditureBudgetTable } from "../../domain/budget/expenditureBudgetTableParsing.js";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import { extractStoredPositionedPdfText } from "../../infrastructure/documentText/extractPositionedPdfText.js";

export interface IngestExpenditureBudgetDeps {
  billRepository: BillRepository;
  documentRepository: DocumentRepository;
  budgetRepository: BudgetRepository;
  rawStorageRoot: string;
}

export interface IngestExpenditureBudgetResult {
  billsProcessed: number;
  categoriesUpserted: number;
}

/**
 * 予算議案(既にBill/Documentとして取り込み済み)のPDF原本を解析し、歳出の款別内訳を
 * Budgetへ反映するユースケース(docs/adr/0024)。新規スクレイパーは使わず、
 * 既存のBillRepository/DocumentRepositoryが持つ原本を再利用する。
 *
 * 会計年度・会計ごとに当初予算をベースラインとして補正予算を適用するため、
 * 対象議案すべてを集めてからaggregateExpenditureBudgetでまとめて処理する。
 */
export async function ingestExpenditureBudget(
  deps: IngestExpenditureBudgetDeps,
): Promise<IngestExpenditureBudgetResult> {
  const candidateBills = await deps.billRepository.findByTitleContaining("予算");

  const billInputs: BudgetBillInput[] = [];
  for (const bill of candidateBills) {
    const classification = classifyBudgetBillTitle(bill.title);
    if (!classification) {
      // 公営企業会計(v1のスコープ外)、または予算議案ではないタイトル
      continue;
    }

    const document = await deps.documentRepository.findById(bill.sourceDocumentId);
    if (!document) {
      continue;
    }

    const positionedItems = await extractStoredPositionedPdfText(deps.rawStorageRoot, document.storagePath);
    const categories = parseExpenditureBudgetTable(positionedItems);
    if (categories.length === 0) {
      // 想定した表形式で解析できなかった場合はスキップする(捏造しない)
      continue;
    }

    billInputs.push({
      billId: bill.id,
      accountName: classification.accountName,
      fiscalYear: classification.fiscalYear,
      amendmentNumber: classification.amendmentNumber,
      submittedDate: bill.submittedDate,
      categories,
    });
  }

  const aggregated = aggregateExpenditureBudget(billInputs);
  const upserts: UpsertBudgetInput[] = aggregated.map((entry) => ({
    fiscalYear: entry.fiscalYear,
    accountName: entry.accountName,
    category: entry.categoryName,
    categoryOrder: Number(entry.categoryNumber),
    amountYen: entry.amountYen,
    relatedBillId: entry.sourceBillId,
    description: entry.description,
  }));

  await deps.budgetRepository.upsertMany(upserts);

  return { billsProcessed: billInputs.length, categoriesUpserted: upserts.length };
}
