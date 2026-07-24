import type { BillRepository } from "../../domain/bill/BillRepository.js";
import { aggregateBudget, type BudgetBillInput } from "../../domain/budget/budgetAggregation.js";
import { classifyBudgetBillTitle } from "../../domain/budget/budgetBillClassification.js";
import type { BudgetRepository, UpsertBudgetInput } from "../../domain/budget/BudgetRepository.js";
import { parseExpenditureBudgetTable, parseRevenueBudgetTable } from "../../domain/budget/budgetTableParsing.js";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import { extractStoredPositionedPdfText } from "../../infrastructure/documentText/extractPositionedPdfText.js";

export interface IngestBudgetDeps {
  billRepository: BillRepository;
  documentRepository: DocumentRepository;
  budgetRepository: BudgetRepository;
  rawStorageRoot: string;
}

export interface IngestBudgetResult {
  billsProcessed: number;
  categoriesUpserted: number;
}

/**
 * 予算議案(既にBill/Documentとして取り込み済み)のPDF原本を解析し、歳出・歳入の
 * 款別内訳をBudgetへ反映するユースケース(docs/adr/0024, 0028)。新規スクレイパーは
 * 使わず、既存のBillRepository/DocumentRepositoryが持つ原本を再利用する。
 *
 * 会計年度・会計ごとに当初予算をベースラインとして補正予算を適用するため、
 * 対象議案すべてを集めてからaggregateBudgetでまとめて処理する。歳出・歳入は
 * 独立した方向として別々に集計する(docs/adr/0028の「方向ごとに独立集計」)。
 */
export async function ingestBudget(deps: IngestBudgetDeps): Promise<IngestBudgetResult> {
  const candidateBills = await deps.billRepository.findByTitleContaining("予算");

  const expenditureBillInputs: BudgetBillInput[] = [];
  const revenueBillInputs: BudgetBillInput[] = [];
  let billsProcessed = 0;

  for (const bill of candidateBills) {
    const classification = classifyBudgetBillTitle(bill.title);
    if (!classification) {
      // 公営企業会計(対象外)、または予算議案ではないタイトル
      continue;
    }

    const document = await deps.documentRepository.findById(bill.sourceDocumentId);
    if (!document) {
      continue;
    }

    const positionedItems = await extractStoredPositionedPdfText(deps.rawStorageRoot, document.storagePath);
    const expenditureCategories = parseExpenditureBudgetTable(positionedItems);
    const revenueCategories = parseRevenueBudgetTable(positionedItems);
    if (expenditureCategories.length === 0 && revenueCategories.length === 0) {
      // 想定した表形式で解析できなかった場合はスキップする(捏造しない)
      continue;
    }
    billsProcessed += 1;

    const billInput = {
      billId: bill.id,
      accountName: classification.accountName,
      fiscalYear: classification.fiscalYear,
      amendmentNumber: classification.amendmentNumber,
      submittedDate: bill.submittedDate,
    };

    // 歳出・歳入は独立に「解析できた方だけ取り込む」(片方だけ失敗してももう片方は反映する)
    if (expenditureCategories.length > 0) {
      expenditureBillInputs.push({ ...billInput, categories: expenditureCategories });
    }
    if (revenueCategories.length > 0) {
      revenueBillInputs.push({ ...billInput, categories: revenueCategories });
    }
  }

  const aggregatedExpenditure = aggregateBudget(expenditureBillInputs);
  const aggregatedRevenue = aggregateBudget(revenueBillInputs);

  const toUpsertInput =
    (budgetType: "expenditure" | "revenue") =>
    (entry: (typeof aggregatedExpenditure)[number]): UpsertBudgetInput => ({
      fiscalYear: entry.fiscalYear,
      accountName: entry.accountName,
      category: entry.categoryName,
      budgetType,
      categoryOrder: Number(entry.categoryNumber),
      amountYen: entry.amountYen,
      relatedBillId: entry.sourceBillId,
      description: entry.description,
    });

  const upserts: UpsertBudgetInput[] = [
    ...aggregatedExpenditure.map(toUpsertInput("expenditure")),
    ...aggregatedRevenue.map(toUpsertInput("revenue")),
  ];

  await deps.budgetRepository.upsertMany(upserts);

  return { billsProcessed, categoriesUpserted: upserts.length };
}
