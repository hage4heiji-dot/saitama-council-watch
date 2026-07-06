import type Anthropic from "@anthropic-ai/sdk";
import type {
  BillAnalysisPort,
  BillAnalysisResult,
  FaqItem,
  GroundingCheckResult,
} from "../../domain/ai/BillAnalysisPort.js";
import { contentHashFor, LlmResponseCache } from "../db/sqlite/LlmResponseCache.js";
import { claudeClient } from "./claudeClient.js";
import {
  BILL_ANALYSIS_PROMPT_VERSION,
  BILL_ANALYSIS_SYSTEM_PROMPT,
  GROUNDING_CHECK_SYSTEM_PROMPT,
} from "./prompts/billAnalysisPrompt.js";

const MODEL = "claude-sonnet-5";

interface AnalysisToolInput {
  summary: string;
  tags: string[];
  faq: FaqItem[];
}

interface GroundingToolInput {
  isFullySupported: boolean;
  unsupportedClaims: string[];
}

const ANALYSIS_TOOL: Anthropic.Tool = {
  name: "emit_bill_analysis",
  description: "議案本文の要約・タグ・FAQを構造化して出力する",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "市民向けの平易な要約(200〜400字程度)" },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "議案の分野を表す短いタグ(例: 予算, 条例改正, 福祉)",
      },
      faq: {
        type: "array",
        items: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
          required: ["question", "answer"],
        },
      },
    },
    required: ["summary", "tags", "faq"],
  },
};

const GROUNDING_TOOL: Anthropic.Tool = {
  name: "emit_grounding_check",
  description: "要約が原文だけで裏付けられるかどうかの検証結果を出力する",
  input_schema: {
    type: "object",
    properties: {
      isFullySupported: { type: "boolean" },
      unsupportedClaims: { type: "array", items: { type: "string" } },
    },
    required: ["isFullySupported", "unsupportedClaims"],
  },
};

function extractToolInput<T>(message: Anthropic.Message, toolName: string): T {
  const block = message.content.find(
    (item): item is Anthropic.ToolUseBlock => item.type === "tool_use" && item.name === toolName,
  );
  if (!block) {
    throw new Error(`Claudeが期待した構造化出力(${toolName})を返しませんでした`);
  }
  return block.input as T;
}

/**
 * Claude APIを用いたBillAnalysisPort実装(Phase3)。
 * 構造化出力(tool_choice強制)とLLM応答キャッシュ(docs/design/01-basic-design.md §6.4)
 * を組み合わせる。
 */
export class ClaudeBillAnalysisAdapter implements BillAnalysisPort {
  constructor(private readonly cache: LlmResponseCache) {}

  async analyze(sourceText: string): Promise<BillAnalysisResult> {
    const hash = contentHashFor(BILL_ANALYSIS_PROMPT_VERSION, sourceText);
    const cached = this.cache.get(hash);
    if (cached) {
      const input = JSON.parse(cached.responseJson) as AnalysisToolInput;
      return { ...input, modelVersion: cached.modelVersion, promptVersion: cached.promptVersion };
    }

    const message = await claudeClient.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: BILL_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `以下は議案の原本テキストです。この内容だけを根拠に分析してください。\n\n---\n${sourceText}\n---`,
        },
      ],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
    });

    const input = extractToolInput<AnalysisToolInput>(message, ANALYSIS_TOOL.name);
    this.cache.set(hash, BILL_ANALYSIS_PROMPT_VERSION, MODEL, JSON.stringify(input));

    return { ...input, modelVersion: MODEL, promptVersion: BILL_ANALYSIS_PROMPT_VERSION };
  }

  async checkGrounding(sourceText: string, summary: string): Promise<GroundingCheckResult> {
    const message = await claudeClient.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: GROUNDING_CHECK_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `# 原文\n${sourceText}\n\n# 要約\n${summary}\n\n要約中で原文に裏付けのない主張を列挙してください。`,
        },
      ],
      tools: [GROUNDING_TOOL],
      tool_choice: { type: "tool", name: GROUNDING_TOOL.name },
    });

    return extractToolInput<GroundingToolInput>(message, GROUNDING_TOOL.name);
  }
}
