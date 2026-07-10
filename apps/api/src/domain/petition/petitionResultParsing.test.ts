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

/**
 * 実データ(令和8年6月定例会 請願審議結果一覧)から抽出したテキスト(docs/adr/0026)。
 * 末尾の請願番号10が「継続審査」で、議決日の行自体が存在しないケースを含む
 * (継続審査は次回以降の会期へ結論を持ち越すため、この時点ではまだ議決日が無い)。
 */
const resultsTextJune = readFileSync(`${fixtureDir}seiganKekkaR08_6.txt`, "utf-8");

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

  it("末尾が継続審査(議決日の行が無い)場合も取りこぼさず、decidedDateはnullにする", () => {
    const items = parsePetitionResultsList(resultsTextJune);
    expect(items).toHaveLength(7);

    expect(items[0]).toEqual({ petitionNumber: "4", resultText: "不採択", decidedDate: "2026-06-04" });
    expect(items[1]).toEqual({ petitionNumber: "9", resultText: "取下げ", decidedDate: "2026-06-25" });
    expect(items[2]).toEqual({ petitionNumber: "5", resultText: "不採択", decidedDate: "2026-06-26" });
    expect(items[3]).toEqual({ petitionNumber: "6", resultText: "不採択", decidedDate: "2026-06-26" });
    expect(items[4]).toEqual({ petitionNumber: "7", resultText: "不採択", decidedDate: "2026-06-26" });
    expect(items[5]).toEqual({ petitionNumber: "8", resultText: "不採択", decidedDate: "2026-06-26" });
    expect(items[6]).toEqual({ petitionNumber: "10", resultText: "継続審査", decidedDate: null });
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
