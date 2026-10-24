import { describe, expect, it } from "vitest";
import type { Bill, Meeting, Petition } from "@saitama-council-watch/shared-types";
import { buildTopicStats, toTopic } from "./topicStats.js";

function fakeMeeting(sessionName: string, startDate: string | null): Meeting {
  return {
    id: crypto.randomUUID(),
    name: sessionName,
    meetingType: "plenary",
    sessionName,
    startDate,
    endDate: null,
    status: "held",
  };
}

function fakeBill(meetingId: string): Bill {
  return {
    id: crypto.randomUUID(),
    meetingId,
    billNumber: "議案第1号",
    title: "テスト議案",
    category: "市長提出議案",
    submittedDate: null,
    status: "passed",
    sourceDocumentId: crypto.randomUUID(),
  };
}

function fakePetition(committeeName: string | null): Petition {
  return {
    id: crypto.randomUUID(),
    meetingId: crypto.randomUUID(),
    petitionNumber: "請願第1号",
    title: "テスト請願",
    receivedDate: null,
    petitionerName: "テスト",
    committeeName,
    summary: "",
    status: "pending",
    decidedDate: null,
    sourceDocumentId: crypto.randomUUID(),
    introducers: [],
  };
}

describe("toTopic", () => {
  it("手続き・形式を表すタグはnullを返す", () => {
    expect(toTopic("条例改正")).toBeNull();
    expect(toTopic("補正予算")).toBeNull();
    expect(toTopic("人事案件")).toBeNull();
  });

  it("表記ゆれはまとめ先のトピック名に読み替える", () => {
    expect(toTopic("道路法")).toBe("道路");
    expect(toTopic("人権擁護委員")).toBe("人権擁護");
  });

  it("対応表にないタグはそのまま返す", () => {
    expect(toTopic("放課後児童クラブ")).toBe("放課後児童クラブ");
  });
});

describe("buildTopicStats", () => {
  it("手続きタグを除外し、同じトピックに寄る複数タグは1議案1件と数える", () => {
    const meeting = fakeMeeting("令和7年2月定例会", "2025-02-04");
    const bill1 = fakeBill(meeting.id);
    const bill2 = fakeBill(meeting.id);
    const tags = new Map([
      [bill1.sourceDocumentId, ["条例改正", "道路法", "道路認定"]],
      [bill2.sourceDocumentId, ["予算", "道路認定", "福祉"]],
    ]);

    const stats = buildTopicStats([{ meeting, bills: [bill1, bill2] }], tags, []);

    expect(stats.topics).toEqual([
      // 代表タグは元タグのうち最も多い「道路認定」(2件)
      { topic: "道路", count: 2, searchTag: "道路認定" },
      { topic: "福祉", count: 1, searchTag: "福祉" },
    ]);
    expect(stats.proceduralTags).toEqual([
      { tag: "条例改正", count: 1 },
      { tag: "予算", count: 1 },
    ]);
  });

  it("タグ未承認の議案は件数に含めるが分析対象からは外す", () => {
    const meeting = fakeMeeting("令和7年2月定例会", "2025-02-04");
    const tagged = fakeBill(meeting.id);
    const untagged = fakeBill(meeting.id);
    const tags = new Map([[tagged.sourceDocumentId, ["福祉"]]]);

    const stats = buildTopicStats([{ meeting, bills: [tagged, untagged] }], tags, []);

    expect(stats.billCount).toBe(2);
    expect(stats.taggedBillCount).toBe(1);
    expect(stats.topics).toEqual([{ topic: "福祉", count: 1, searchTag: "福祉" }]);
  });

  it("会期は開始日の古い順に並べ、会期ごとのトピック件数を返す", () => {
    const later = fakeMeeting("令和8年2月定例会", "2026-02-04");
    const earlier = fakeMeeting("令和7年2月定例会", "2025-02-04");
    const laterBill = fakeBill(later.id);
    const earlierBill = fakeBill(earlier.id);
    const tags = new Map([
      [laterBill.sourceDocumentId, ["消防"]],
      [earlierBill.sourceDocumentId, ["福祉"]],
    ]);

    const stats = buildTopicStats(
      [
        { meeting: later, bills: [laterBill] },
        { meeting: earlier, bills: [earlierBill] },
      ],
      tags,
      [],
    );

    expect(stats.sessions.map((s) => s.sessionName)).toEqual(["令和7年2月定例会", "令和8年2月定例会"]);
    expect(stats.sessions[1]?.topics).toEqual([{ topic: "消防", count: 1 }]);
  });

  it("請願を付託委員会ごとに数え、委員会未定は「未付託」にまとめる", () => {
    const petitions = [fakePetition("保健福祉"), fakePetition("保健福祉"), fakePetition(null)];

    const stats = buildTopicStats([], new Map(), petitions);

    expect(stats.petitionCount).toBe(3);
    expect(stats.petitionsByCommittee).toEqual([
      { committee: "保健福祉", count: 2 },
      { committee: "未付託", count: 1 },
    ]);
  });
});
