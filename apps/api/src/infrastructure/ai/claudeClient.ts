import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";

/**
 * Claude APIへの唯一の入口。プロンプトテンプレート・グラウンディング検証・
 * 構造化出力の実装はPhase3(AIパイプライン)で追加する
 * (docs/design/01-basic-design.md §6, docs/adr/0007-ai-human-review-gate.md)。
 *
 * AIの役割はここでは「要約/分類/タグ付け/FAQ生成/市民向け説明/関連情報抽出」に限定し、
 * 原本(sourceDocumentId)を持たない生成は呼び出し元(application層)で拒否すること。
 */
export const claudeClient = new Anthropic({
  apiKey: env.CLAUDE_API_KEY,
});
