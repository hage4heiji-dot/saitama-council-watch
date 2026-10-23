import type { Bill, Meeting, Petition, TopicStats } from "@saitama-council-watch/shared-types";

/**
 * 統計ページ(議題トピック分析、docs/adr/0029)の集計ロジック。
 *
 * 承認済みAIタグ(docs/adr/0007)をそのまま数えると、上位が「条例改正」「予算」「人事案件」
 * のような議案の形式・手続きを表す語で埋まり、「どんな内容の話が多いか」が見えない
 * (2026-10時点の実データで上位5語がすべて手続き語だった)。そこで:
 *
 * 1. 手続き・形式を表すタグ(PROCEDURAL_TAGS)は政策トピックから除外する(除外分も件数ごと返して透明性を保つ)
 * 2. 表記ゆれ・細分化しすぎたタグ(TOPIC_ALIASES)は1つのトピックにまとめる
 * 3. 議案単位で数える(1議案の「道路法」「道路認定」は「道路」1件)
 *
 * タグ自体を新たに生成・改変するわけではなく、承認済みタグの読み替え規則のみを持つ。
 */

export const PROCEDURAL_TAGS: ReadonlySet<string> = new Set([
  // 条例・議決の形式
  "条例改正",
  "条例制定",
  "条例廃止",
  "条例",
  "廃止",
  "経過措置",
  "罰則",
  "議決",
  "議会議決",
  "契約議決",
  "専決処分",
  "決算認定",
  "法定協議",
  "地方自治法",
  // 予算・財政の形式
  "予算",
  "補正予算",
  "予算補正",
  "特別会計",
  "一般会計",
  "歳入歳出",
  "地方債",
  "市債",
  "企業債",
  "債務負担行為",
  "繰越明許費",
  "継続費",
  "公債管理",
  "公債費",
  "資本的支出",
  "基金繰入金",
  // 人事・同意案件の形式
  "人事案件",
  "人事",
  "委員会",
  "推薦",
  "委員推薦",
  "委員任命",
  "委員選任",
  "候補者推薦",
  "任命",
  "同意案件",
  "同意",
  "同意案",
  // 契約・財産の形式
  "契約",
  "契約変更",
  "契約金額変更",
  "財産取得",
  "権利放棄",
]);

/** 元タグ → まとめ先のトピック名 */
export const TOPIC_ALIASES: ReadonlyMap<string, string> = new Map([
  ["人権擁護委員", "人権擁護"],
  ["人権", "人権擁護"],
  ["土地区画整理", "土地区画整理事業"],
  ["水道事業会計", "水道事業"],
  ["道路法", "道路"],
  ["道路認定", "道路"],
  ["道路廃止", "道路"],
  ["道路管理", "道路"],
  ["道路整備", "道路"],
  ["市道", "道路"],
  ["市道路線", "道路"],
  ["都市公園法", "公園"],
  ["都市公園", "公園"],
  ["公園整備", "公園"],
  ["公園管理", "公園"],
  ["学校建設", "学校施設"],
  ["教育施設", "学校施設"],
  ["消防団", "消防"],
  ["消防設備", "消防"],
  ["給与", "職員の給与・勤務"],
  ["職員給与", "職員の給与・勤務"],
  ["給与・手当", "職員の給与・勤務"],
  ["手当", "職員の給与・勤務"],
  ["期末手当", "職員の給与・勤務"],
  ["退職手当", "職員の給与・勤務"],
  ["職員待遇", "職員の給与・勤務"],
  ["勤務時間", "職員の給与・勤務"],
  ["勤務環境", "職員の給与・勤務"],
  ["介護休暇", "職員の給与・勤務"],
  ["職員配置", "職員の給与・勤務"],
  ["固定資産税", "市税"],
  ["軽自動車税", "市税"],
  ["市民税", "市税"],
  ["税制改正", "市税"],
  ["税制", "市税"],
  ["と畜場", "食肉市場"],
  ["育児支援", "子育て支援"],
  ["保育", "子育て支援"],
  ["工事", "公共工事"],
  ["工事請負契約", "公共工事"],
  ["建築工事", "公共工事"],
  ["建設工事", "公共工事"],
  ["電気設備工事", "公共工事"],
  ["固定資産評価審査委員会", "固定資産評価"],
  ["手数料", "手数料・使用料"],
  ["使用料", "手数料・使用料"],
  ["利用料金", "手数料・使用料"],
]);

/** 手続きタグならnull、それ以外はまとめ先のトピック名を返す */
export function toTopic(tag: string): string | null {
  if (PROCEDURAL_TAGS.has(tag)) {
    return null;
  }
  return TOPIC_ALIASES.get(tag) ?? tag;
}

/** 1議案のタグ配列 → 重複を除いたトピック集合 */
function topicsOfBill(tags: string[]): Set<string> {
  const topics = new Set<string>();
  for (const tag of tags) {
    const topic = toTopic(tag);
    if (topic) {
      topics.add(topic);
    }
  }
  return topics;
}

function sortCounts<T extends { count: number }>(items: T[], key: (item: T) => string): T[] {
  return items.sort((a, b) => b.count - a.count || key(a).localeCompare(key(b), "ja"));
}

export interface SessionBills {
  meeting: Meeting;
  bills: Bill[];
}

export function buildTopicStats(
  sessions: SessionBills[],
  tagsBySourceDocumentId: Map<string, string[]>,
  petitions: Petition[],
): TopicStats {
  const topicCounts = new Map<string, number>();
  // トピック → (元タグ → 件数)。検索リンクに使う代表タグを決めるため
  const rawTagCountsByTopic = new Map<string, Map<string, number>>();
  const proceduralCounts = new Map<string, number>();
  let billCount = 0;
  let taggedBillCount = 0;

  const sessionResults: TopicStats["sessions"] = [];
  const orderedSessions = [...sessions].sort((a, b) =>
    (a.meeting.startDate ?? "").localeCompare(b.meeting.startDate ?? ""),
  );

  for (const { meeting, bills } of orderedSessions) {
    const sessionCounts = new Map<string, number>();
    for (const bill of bills) {
      billCount += 1;
      const tags = tagsBySourceDocumentId.get(bill.sourceDocumentId);
      if (!tags) {
        continue; // タグ未承認の議案は捏造を避けて対象外(docs/adr/0007)
      }
      taggedBillCount += 1;

      for (const tag of new Set(tags)) {
        const topic = toTopic(tag);
        if (!topic) {
          proceduralCounts.set(tag, (proceduralCounts.get(tag) ?? 0) + 1);
          continue;
        }
        const rawCounts = rawTagCountsByTopic.get(topic) ?? new Map<string, number>();
        rawCounts.set(tag, (rawCounts.get(tag) ?? 0) + 1);
        rawTagCountsByTopic.set(topic, rawCounts);
      }
      for (const topic of topicsOfBill(tags)) {
        topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
        sessionCounts.set(topic, (sessionCounts.get(topic) ?? 0) + 1);
      }
    }
    sessionResults.push({
      meetingId: meeting.id,
      sessionName: meeting.sessionName,
      startDate: meeting.startDate,
      billCount: bills.length,
      topics: sortCounts(
        [...sessionCounts.entries()].map(([topic, count]) => ({ topic, count })),
        (item) => item.topic,
      ),
    });
  }

  const topics = sortCounts(
    [...topicCounts.entries()].map(([topic, count]) => {
      const rawCounts = [...(rawTagCountsByTopic.get(topic) ?? new Map<string, number>()).entries()];
      const searchTag = sortCounts(
        rawCounts.map(([tag, n]) => ({ tag, count: n })),
        (item) => item.tag,
      )[0]?.tag;
      return { topic, count, searchTag: searchTag ?? topic };
    }),
    (item) => item.topic,
  );

  const committeeCounts = new Map<string, number>();
  for (const petition of petitions) {
    const committee = petition.committeeName ?? "未付託";
    committeeCounts.set(committee, (committeeCounts.get(committee) ?? 0) + 1);
  }

  return {
    billCount,
    taggedBillCount,
    topics,
    proceduralTags: sortCounts(
      [...proceduralCounts.entries()].map(([tag, count]) => ({ tag, count })),
      (item) => item.tag,
    ),
    sessions: sessionResults,
    petitionCount: petitions.length,
    petitionsByCommittee: sortCounts(
      [...committeeCounts.entries()].map(([committee, count]) => ({ committee, count })),
      (item) => item.committee,
    ),
  };
}
