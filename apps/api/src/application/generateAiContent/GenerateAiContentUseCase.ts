import type { AiContentRepository } from "../../domain/aiContent/AiContentRepository.js";
import type { BillAnalysisPort } from "../../domain/ai/BillAnalysisPort.js";
import { mechanicalGroundingCheck } from "../../domain/ai/mechanicalGroundingCheck.js";
import type { BillRepository } from "../../domain/bill/BillRepository.js";
import type { DocumentRepository } from "../../domain/document/DocumentRepository.js";
import { extractPdfText } from "../../infrastructure/documentText/extractPdfText.js";

export interface GenerateAiContentDeps {
  billRepository: BillRepository;
  documentRepository: DocumentRepository;
  aiContentRepository: AiContentRepository;
  billAnalysisPort: BillAnalysisPort;
  rawStorageRoot: string;
}

export interface GenerateAiContentOptions {
  /** 1回の実行で処理する議案数の上限(API利用料金・レート制限への配慮) */
  limit: number;
}

export interface GenerateAiContentResult {
  processed: number;
  flaggedForReview: number;
  skipped: number;
}

/**
 * 議案本文(PDF)からAI要約・タグ・FAQを生成しPostgresへ保存するユースケース(Phase3)。
 * docs/design/01-basic-design.md §5 ⑥〜⑨、§6のグラウンディング検証に対応。
 *
 * 生成された全コンテンツは is_verified=false で保存し、公開はしない
 * (docs/adr/0007-ai-human-review-gate.md)。グラウンディング検証で問題が
 * 見つかった場合は groundingNote に理由を記録し、管理画面での優先確認対象にする。
 */
export async function generateAiContent(
  deps: GenerateAiContentDeps,
  options: GenerateAiContentOptions,
): Promise<GenerateAiContentResult> {
  const targetBills = await deps.billRepository.findWithoutAiContent(options.limit);

  let processed = 0;
  let flaggedForReview = 0;
  let skipped = 0;

  for (const bill of targetBills) {
    const document = await deps.documentRepository.findById(bill.sourceDocumentId);
    if (!document) {
      skipped += 1;
      continue;
    }

    const sourceText = await extractPdfText(deps.rawStorageRoot, document.storagePath);
    if (sourceText.length === 0) {
      // 画像PDF等でテキストが抽出できない場合は捏造を避けるため生成しない
      skipped += 1;
      continue;
    }

    const analysis = await deps.billAnalysisPort.analyze(sourceText);

    const mechanicalResult = mechanicalGroundingCheck(sourceText, analysis.summary);
    const selfCheckResult = await deps.billAnalysisPort.checkGrounding(sourceText, analysis.summary);
    const needsReview = !mechanicalResult.passed || !selfCheckResult.isFullySupported;

    const groundingNoteParts: string[] = [];
    if (!mechanicalResult.passed) {
      groundingNoteParts.push(
        `機械的チェック: 原文に見当たらない数値 [${mechanicalResult.unsupportedNumbers.join(", ")}]`,
      );
    }
    if (!selfCheckResult.isFullySupported) {
      groundingNoteParts.push(
        `自己検証パス: 裏付け不明な主張 [${selfCheckResult.unsupportedClaims.join(" / ")}]`,
      );
    }
    const groundingNote = groundingNoteParts.length > 0 ? groundingNoteParts.join("\n") : undefined;

    await deps.aiContentRepository.create({
      sourceDocumentId: bill.sourceDocumentId,
      contentType: "summary",
      body: analysis.summary,
      modelVersion: analysis.modelVersion,
      promptVersion: analysis.promptVersion,
      groundingNote,
    });
    await deps.aiContentRepository.create({
      sourceDocumentId: bill.sourceDocumentId,
      contentType: "tags",
      body: JSON.stringify(analysis.tags),
      modelVersion: analysis.modelVersion,
      promptVersion: analysis.promptVersion,
    });
    await deps.aiContentRepository.create({
      sourceDocumentId: bill.sourceDocumentId,
      contentType: "faq",
      body: JSON.stringify(analysis.faq),
      modelVersion: analysis.modelVersion,
      promptVersion: analysis.promptVersion,
    });

    processed += 1;
    if (needsReview) {
      flaggedForReview += 1;
    }
  }

  return { processed, flaggedForReview, skipped };
}
