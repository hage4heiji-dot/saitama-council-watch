import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapPetitionResultToStatus, parsePetitionResultsList } from "./petitionResultParsing.js";

const fixtureDir = fileURLToPath(new URL("./__fixtures__/", import.meta.url));

/**
 * 実データ(令和8年2月定例会 請願審議結果一覧)から抽出したテキスト(docs/adr/0026)。
 * 内容は原本PDFを目視で確認済み。
 */
const resultsText = readFileSync(`${fixtureDir}seiganKekkaR08_02.txt`, "utf-8");

describe("parsePetitionResultsList", () => {
  it("4件の審議結果を、番号・結果文言・議決日で抽出する", () => {
    const items = parsePetitionResultsList(resultsText);
    expect(items).toHaveLength(4);

    expect(items[0]).toEqual({ petitionNumber: "28", resultText: "不採択", decidedDate: "2026-03-12" });
    expect(items[1]).toEqual({ petitionNumber: "1", resultText: "取下げ", decidedDate: "2026-03-11" });
    expect(items[2]).toEqual({ petitionNumber: "2", resultText: "不採択", decidedDate: "2026-03-12" });
    expect(items[3]).toEqual({ petitionNumber: "3", resultText: "不採択", decidedDate: "2026-03-12" });
  });

  it("結果一覧にまだ載っていない請願(審議中)は含まれない", () => {
    const items = parsePetitionResultsList(resultsText);
    expect(items.find((i) => i.petitionNumber === "4")).toBeUndefined();
  });

  it("該当がないテキストからは空配列を返す(捏造しない)", () => {
    expect(parsePetitionResultsList("無関係なテキスト")).toEqual([]);
  });
});

describe("mapPetitionResultToStatus", () => {
  it.each([
    ["採択", "adopted"],
    ["不採択", "rejected"],
    ["取下げ", "withdrawn"],
    ["継続審査", "carried_over"],
    ["継続審議", "carried_over"],
  ] as const)("「%s」を%sに変換する", (resultText, expected) => {
    expect(mapPetitionResultToStatus(resultText)).toBe(expected);
  });

  it("未知の文言はnullを返す(捏造しない)", () => {
    expect(mapPetitionResultToStatus("想定外の結果")).toBeNull();
  });
});
