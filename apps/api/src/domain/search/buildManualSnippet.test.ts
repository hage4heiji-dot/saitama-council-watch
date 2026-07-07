import { SNIPPET_HIGHLIGHT_END, SNIPPET_HIGHLIGHT_START } from "@saitama-council-watch/shared-types";
import { describe, expect, it } from "vitest";
import { buildManualSnippet } from "./buildManualSnippet.js";

describe("buildManualSnippet", () => {
  it("一致箇所を制御文字で囲む(FTS5のsnippet()と同じマーカー)", () => {
    const content = "第106号 専決処分の報告及び承認を求めることについて（さいたま市市税条例等の一部を改正する条例の制定について） 令和8年6月定例会";
    const snippet = buildManualSnippet(content, "市税");
    expect(snippet).toContain(`${SNIPPET_HIGHLIGHT_START}市税${SNIPPET_HIGHLIGHT_END}`);
  });

  it("一致箇所の前後にのみ...を付け、全文を含めない", () => {
    const content = "あ".repeat(50) + "市税" + "い".repeat(50);
    const snippet = buildManualSnippet(content, "市税");
    expect(snippet.startsWith("...")).toBe(true);
    expect(snippet.endsWith("...")).toBe(true);
    expect(snippet.length).toBeLessThan(content.length);
  });

  it("先頭付近の一致では先頭に...を付けない", () => {
    const content = "市税条例について" + "い".repeat(50);
    const snippet = buildManualSnippet(content, "市税");
    expect(snippet.startsWith("...")).toBe(false);
  });

  it("一致しない場合は全文をそのまま返す(捏造しない)", () => {
    const content = "無関係な内容です";
    expect(buildManualSnippet(content, "存在しない語")).toBe(content);
  });
});
