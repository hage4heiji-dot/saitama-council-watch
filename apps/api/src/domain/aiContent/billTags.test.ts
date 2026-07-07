import { describe, expect, it } from "vitest";
import type { AiContent } from "@saitama-council-watch/shared-types";
import { buildSourceDocumentTagsMap, sourceDocumentIdsForTag } from "./billTags.js";

function fakeTagContent(sourceDocumentId: string, tags: string[]): AiContent {
  return {
    id: crypto.randomUUID(),
    sourceDocumentId,
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

describe("buildSourceDocumentTagsMap", () => {
  it("sourceDocumentIdごとのタグ配列を組み立てる", () => {
    const contents = [fakeTagContent("doc-1", ["予算", "福祉"]), fakeTagContent("doc-2", ["条例改正"])];
    const map = buildSourceDocumentTagsMap(contents);
    expect(map.get("doc-1")).toEqual(["予算", "福祉"]);
    expect(map.get("doc-2")).toEqual(["条例改正"]);
  });

  it("不正な形式の行は捏造を避けて無視する", () => {
    const malformed: AiContent = { ...fakeTagContent("doc-3", []), body: "not json" };
    const map = buildSourceDocumentTagsMap([malformed]);
    expect(map.has("doc-3")).toBe(false);
  });
});

describe("sourceDocumentIdsForTag", () => {
  it("指定したタグを含む議案のsourceDocumentIdのみを返す", () => {
    const contents = [
      fakeTagContent("doc-1", ["予算", "福祉"]),
      fakeTagContent("doc-2", ["条例改正"]),
      fakeTagContent("doc-3", ["予算"]),
    ];
    expect(sourceDocumentIdsForTag(contents, "予算").sort()).toEqual(["doc-1", "doc-3"]);
    expect(sourceDocumentIdsForTag(contents, "存在しないタグ")).toEqual([]);
  });
});
