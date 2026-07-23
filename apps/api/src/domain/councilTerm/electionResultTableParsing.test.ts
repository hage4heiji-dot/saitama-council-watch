import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildCouncilTermCandidates, parseElectionResultDocument } from "./electionResultTableParsing.js";

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "__fixtures__");

/**
 * 2003年(平成15年)さいたま市議会議員一般選挙の「得票数及び当選人」PDFを
 * pdftotext -layoutで実際に抽出したテキスト(docs/adr/0027)。西区・中央区は
 * 任期途中の辞職・繰上補充選挙が実際に発生した区、北区は通常の当選のみの区。
 */
const h15Text = readFileSync(join(fixtureDir, "h15-tokuhyousuu-tousennin.txt"), "utf-8");
/** 平成19年(2007年)。区名見出しが「西区」単独行になる書式(2003年の【】囲みと異なる) */
const h19Text = readFileSync(join(fixtureDir, "h19-tokuhyousuu-tousennin.txt"), "utf-8");
/** 平成23年(2011年)。岩槻区で辞職・繰上当選が実際に発生している(2003年と句読点の入り方が異なる脚注文) */
const h23Text = readFileSync(join(fixtureDir, "h23-tokuhyousuu-tousennin.txt"), "utf-8");
/** 平成27年(2015年)。北区がこのPDFに含まれない(無投票当選等の理由と推測。捏造せずそのまま反映する) */
const h27Text = readFileSync(join(fixtureDir, "h27-tokuhyousuu-tousennin.txt"), "utf-8");
/** 平成31年(2019年)。区名見出しが選挙名と同じ行の末尾に続く書式 */
const h31Text = readFileSync(join(fixtureDir, "h31-tokuhyousuu-tousennin.txt"), "utf-8");
/** 令和5年(2023年)。h31と同じ見出し書式 */
const r5Text = readFileSync(join(fixtureDir, "r5-tousennninn.txt"), "utf-8");

describe("parseElectionResultDocument", () => {
  const wards = parseElectionResultDocument(h15Text);

  it("実データの9区すべてを区名で分割できる", () => {
    expect(wards.map((w) => w.ward)).toEqual([
      "西区",
      "北区",
      "大宮区",
      "見沼区",
      "中央区",
      "桜区",
      "浦和区",
      "南区",
      "緑区",
    ]);
  });

  it("任期の明記(「当選人の任期」行)を全区で抽出できる", () => {
    for (const ward of wards) {
      expect(ward.termStartDate).toBe("2003-05-01");
      expect(ward.termEndDate).toBe("2007-04-30");
    }
  });

  it("西区: 当選人5名+繰上当選対象1名を候補行として抽出し、落選者は含まない", () => {
    const nishiku = wards.find((w) => w.ward === "西区")!;
    const electedRows = nishiku.candidates.filter((c) => c.wasOriginallyElected);
    expect(electedRows).toHaveLength(5);
    expect(electedRows[0]).toEqual({
      rank: 1,
      wasOriginallyElected: true,
      surname: "上三信",
      givenName: "あきら",
      party: "公明党",
      voteCount: 5302,
    });
    // 沢田哲夫(6位、非当選)は※マーク付きで繰上当選した候補として存在する
    const succession = nishiku.candidates.find((c) => c.rank === 6);
    expect(succession?.wasOriginallyElected).toBe(false);
    expect(succession?.surname).toBe("沢田");
  });

  it("西区: 辞職・繰上当選の脚注を実データ通りに解析する", () => {
    const nishiku = wards.find((w) => w.ward === "西区")!;
    expect(nishiku.resignationEvents).toEqual([
      {
        resignedName: "河野 正",
        resignedDate: "2003-05-31",
        successionDate: "2003-06-10",
        successorName: "沢田哲夫",
      },
    ]);
  });

  it("中央区: 辞職・繰上当選の脚注を実データ通りに解析する(氏名の空白の入り方が西区と異なるケース)", () => {
    const chuouku = wards.find((w) => w.ward === "中央区")!;
    expect(chuouku.resignationEvents).toEqual([
      {
        resignedName: "黒田一郎",
        resignedDate: "2003-05-15",
        successionDate: "2003-05-28",
        successorName: "森永ルミ子",
      },
    ]);
  });

  it("北区: 辞職がない区では脚注が空配列になる", () => {
    const kitaku = wards.find((w) => w.ward === "北区")!;
    expect(kitaku.resignationEvents).toEqual([]);
    expect(kitaku.candidates.filter((c) => c.wasOriginallyElected)).toHaveLength(8);
  });

  it("政党名が「無所属」の場合はnullにする(捏造しないための正規化)", () => {
    const kitaku = wards.find((w) => w.ward === "北区")!;
    const seki = kitaku.candidates.find((c) => c.surname === "清水");
    expect(seki?.party).toBeNull();
  });
});

describe("parseElectionResultDocument (2007年以降の書式差異)", () => {
  it("2007年: 区名が単独行の書式でも10区すべて分割でき、任期の明記はないためnullのまま", () => {
    const wards = parseElectionResultDocument(h19Text);
    expect(wards).toHaveLength(10);
    expect(wards.map((w) => w.ward)).toContain("岩槻区");
    for (const ward of wards) {
      expect(ward.termStartDate).toBeNull();
      expect(ward.termEndDate).toBeNull();
    }
    // 得票数が整数表記(小数点なし)でも正しく数値として解析できる
    const nishiku = wards.find((w) => w.ward === "西区")!;
    const ikeda = nishiku.candidates.find((c) => c.rank === 1)!;
    expect(ikeda.surname).toBe("池田");
    expect(ikeda.givenName).toBe("まり");
    expect(ikeda.voteCount).toBe(6709);
  });

  it("2011年: 岩槻区の辞職・繰上当選(句読点の入り方が2003年と異なる脚注文)を正しく解析する", () => {
    const wards = parseElectionResultDocument(h23Text);
    const iwatsukiku = wards.find((w) => w.ward === "岩槻区")!;
    expect(iwatsukiku.resignationEvents).toEqual([
      {
        resignedName: "北村たかゆき",
        resignedDate: "2011-05-10",
        successionDate: "2011-05-20",
        successorName: "高野ひでき",
      },
    ]);
    const succession = iwatsukiku.candidates.find((c) => c.rank === 6);
    expect(succession?.wasOriginallyElected).toBe(false);
    expect(succession?.surname).toBe("高野");
  });

  it("2015年: このPDFに含まれない区(北区)は結果に現れない(捏造しない。無投票等の理由と推測)", () => {
    const wards = parseElectionResultDocument(h27Text);
    expect(wards.map((w) => w.ward)).not.toContain("北区");
    expect(wards).toHaveLength(9);
  });

  it("2019年: 区名が選挙名と同じ行の末尾に続く書式でも10区すべて分割できる", () => {
    const wards = parseElectionResultDocument(h31Text);
    expect(wards).toHaveLength(10);
    const nishiku = wards.find((w) => w.ward === "西区")!;
    expect(nishiku.candidates.filter((c) => c.wasOriginallyElected)).toHaveLength(4);
  });

  it("2023年: 姓名の間隔が広い書式(複数空白)でも正しく姓/名に分割できる", () => {
    const wards = parseElectionResultDocument(r5Text);
    expect(wards).toHaveLength(10);
    const nishiku = wards.find((w) => w.ward === "西区")!;
    const izumo = nishiku.candidates.find((c) => c.rank === 1)!;
    expect(izumo.surname).toBe("出雲");
    expect(izumo.givenName).toBe("けいこ");
    expect(izumo.voteCount).toBe(6872);
  });
});

describe("buildCouncilTermCandidates", () => {
  const wards = parseElectionResultDocument(h15Text);

  it("西区: 当選5名+繰上当選1名=6行を組み立てる。辞職者・繰上当選者の対応が取れる", () => {
    const nishiku = wards.find((w) => w.ward === "西区")!;
    const rows = buildCouncilTermCandidates(nishiku, "2003-04-13", "regular");
    expect(rows).toHaveLength(6);

    const kawano = rows.find((r) => r.candidateRawName === "河野 正")!;
    expect(kawano.origin).toBe("election");
    expect(kawano.resignedDate).toBe("2003-05-31");
    expect(kawano.successorRawName).toBe("沢田哲夫");
    expect(kawano.termStartDate).toBe("2003-05-01");
    expect(kawano.termStartDateBasis).toBe("explicit");

    const sawada = rows.find((r) => r.origin === "runner_up_succession")!;
    expect(sawada.candidateRawName).toBe("沢田 哲夫");
    expect(sawada.predecessorRawName).toBe("河野 正");
    expect(sawada.termStartDate).toBe("2003-06-10");
    expect(sawada.termStartDateBasis).toBe("explicit");
    expect(sawada.termEndDate).toBe("2007-04-30");
    expect(sawada.partyRawName).toBeNull(); // 無所属だったためnull
    expect(sawada.electedRank).toBe(6);
  });

  it("北区: 辞職がない場合は当選者数と同数の行になる", () => {
    const kitaku = wards.find((w) => w.ward === "北区")!;
    const rows = buildCouncilTermCandidates(kitaku, "2003-04-13", "regular");
    expect(rows).toHaveLength(8);
    expect(rows.every((r) => r.origin === "election")).toBe(true);
    expect(rows.every((r) => r.resignedDate === null)).toBe(true);
  });
});
