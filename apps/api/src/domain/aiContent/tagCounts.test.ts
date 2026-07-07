import { describe, expect, it } from "vitest";
import { aggregateTagCounts } from "./tagCounts.js";
import type { AiContent } from "@saitama-council-watch/shared-types";

function fakeTagContent(tags: string[]): AiContent {
  return {
    id: crypto.randomUUID(),
    sourceDocumentId: crypto.randomUUID(),
    contentType: "tags",
    body: JSON.stringify(tags),
    modelVersion: "test-model",
    promptVersion: "v1",
    generatedAt: new Date().toISOString(),
    isVerified: true,
    verifiedBy: "tester",
    verifiedAt: new Date().toISOString(),
    groundingNote: null,
  };
}

describe("aggregateTagCounts", () => {
  it("複数議案にまたがるタグの出現回数を集計する", () => {
    const contents = [fakeTagContent(["予算", "福祉"]), fakeTagContent(["予算", "条例改正"]), fakeTagContent(["予算"])];

    expect(aggregateTagCounts(contents)).toEqual([
      { tag: "予算", count: 3 },
      { tag: "条例改正", count: 1 },
      { tag: "福祉", count: 1 },
    ]);
  });

  it("不正な形式(JSON配列でない)の行は捏造を避けて無視する", () => {
    const malformed: AiContent = { ...fakeTagContent([]), body: "not json" };
    const valid = fakeTagContent(["予算"]);

    expect(aggregateTagCounts([malformed, valid])).toEqual([{ tag: "予算", count: 1 }]);
  });

  it("空配列の場合は空配列を返す", () => {
    expect(aggregateTagCounts([])).toEqual([]);
  });
});
