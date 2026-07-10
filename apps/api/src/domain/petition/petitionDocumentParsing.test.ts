import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePetitionDocumentTable } from "./petitionDocumentParsing.js";

const fixtureDir = fileURLToPath(new URL("./__fixtures__/", import.meta.url));

/**
 * 実データ(令和8年2月定例会 請願文書表、配布分1・2)から抽出したテキスト(docs/adr/0026)。
 * 内容は原本PDFを目視で確認済み。
 */
const part1 = readFileSync(`${fixtureDir}seiganBunshohyoR08_02_part1.txt`, "utf-8");
const part2 = readFileSync(`${fixtureDir}seiganBunshohyoR08_02_part2.txt`, "utf-8");

describe("parsePetitionDocumentTable", () => {
  it("配布分1: 4件の請願を正しい件名・受理日・付託委員会で抽出する", () => {
    const items = parsePetitionDocumentTable(part1);
    expect(items).toHaveLength(4);

    expect(items[0]).toMatchObject({
      petitionNumber: "28",
      receivedDate: "2025-12-18",
      title: "善前墓地と諏訪入墓地と諏訪入第２墓地の空き墓地について",
      committeeName: "保健福祉",
    });
    expect(items[0]?.petitionerName).toBe("川島 浩");
    expect(items[0]?.introducingLegislatorsRawText).toContain("吉田");
  });

  it("紹介議員欄の原文をそのまま保持する(分割・名寄せはpetitionLegislatorMatching.tsに委ねる)", () => {
    const items = parsePetitionDocumentTable(part1);
    const item3 = items.find((i) => i.petitionNumber === "3");
    expect(item3?.introducingLegislatorsRawText).toContain("久保");
    expect(item3?.introducingLegislatorsRawText).toContain("金子");
  });

  it("要旨から定型の結び文言(地方自治法第124条...)を取り除く", () => {
    const items = parsePetitionDocumentTable(part1);
    expect(items[0]?.summary).not.toMatch(/地方自治法第124条/);
    expect(items[0]?.summary).toContain("募集を再開してください");
  });

  it("配布分2(その2): 追加の1件を抽出する", () => {
    const items = parsePetitionDocumentTable(part2);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      petitionNumber: "4",
      receivedDate: "2026-03-04",
      title: "市境の公共施設利用料金について協定を結んでください",
      committeeName: "総合政策",
    });
  });

  it("該当がないテキストからは空配列を返す(捏造しない)", () => {
    expect(parsePetitionDocumentTable("無関係なテキスト")).toEqual([]);
  });

  it("伏字が空白区切りで複数グループに分かれる場合も、住所欄をすべて除いて氏名を抽出する(実データ由来の回帰テスト)", () => {
    // 令和8年6月定例会 請願第7号: 個人と団体代表者を併記する住所欄で、伏字が
    // 「○○○○○○○○○○○○○ ○○○○○○○」のように空白を挟んで2グループに分かれる
    const syntheticText = `付託委員会名 総合政策

請願番号 ７ 受理年月日 令和８年５月25日
件   名 テスト用の請願
請願者
住所・氏名
○○○○○○○○○○○○○ ○○○○○○○
さいたま地区労働組合協議会
議長 前島 英男
紹介議員
氏   名
鳥羽  恵  池田 めぐみ
要   旨
要旨
本文。
以上、地方自治法第124条の規定により、請願します。`;
    const items = parsePetitionDocumentTable(syntheticText);
    expect(items).toHaveLength(1);
    expect(items[0]?.petitionerName).not.toContain("○");
    expect(items[0]?.petitionerName).toBe("さいたま地区労働組合協議会 議長 前島 英男");
  });
});
