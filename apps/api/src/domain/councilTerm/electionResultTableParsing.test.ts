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
