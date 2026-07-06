/**
 * ポート(interface)。Claude APIへの依存はinfrastructure/ai配下に閉じ込める
 * (docs/adr/0001-architecture-style.md)。
 *
 * AIの役割は要約・分類・タグ付け・FAQ生成・関連情報抽出に限定する
 * (docs/design/00-constitution.md)。実装は与えられた原本テキスト以外の
 * 知識を使わないことをシステムプロンプトで強制する。
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export interface BillAnalysisResult {
  summary: string;
  tags: string[];
  faq: FaqItem[];
  modelVersion: string;
  promptVersion: string;
}

export interface GroundingCheckResult {
  isFullySupported: boolean;
  unsupportedClaims: string[];
}

export interface BillAnalysisPort {
  /** 原本テキストのみを根拠に要約・タグ・FAQを生成する */
  analyze(sourceText: string): Promise<BillAnalysisResult>;
  /** 生成された要約が原本テキストだけで裏付けられるかを別セッションで問い直す(自己検証パス) */
  checkGrounding(sourceText: string, summary: string): Promise<GroundingCheckResult>;
}
