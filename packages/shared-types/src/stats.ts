import { z } from "zod";
import { IsoDateSchema } from "./common.js";

/**
 * 統計ページ(議題トピック分析、docs/adr/0029)向け。
 * 承認済みAIタグを「政策トピック」に正規化して議案単位で数える。
 */
export const TopicCountSchema = z.object({
  topic: z.string().min(1),
  /** そのトピックを含む議案の件数(1議案で同じトピックに寄る複数タグは1件と数える) */
  count: z.number().int().nonnegative(),
  /** 議案検索(/search?tag=)へのリンク用。トピックにまとめた元タグのうち最も多いもの */
  searchTag: z.string().min(1),
});
export type TopicCount = z.infer<typeof TopicCountSchema>;

export const SessionTopicsSchema = z.object({
  meetingId: z.string().uuid(),
  sessionName: z.string(),
  startDate: IsoDateSchema.nullable(),
  billCount: z.number().int().nonnegative(),
  topics: z.array(z.object({ topic: z.string(), count: z.number().int().nonnegative() })),
});
export type SessionTopics = z.infer<typeof SessionTopicsSchema>;

export const CommitteeCountSchema = z.object({
  committee: z.string(),
  count: z.number().int().nonnegative(),
});
export type CommitteeCount = z.infer<typeof CommitteeCountSchema>;

export const TopicStatsSchema = z.object({
  billCount: z.number().int().nonnegative(),
  /** 承認済みタグが付いている議案の件数(分析対象) */
  taggedBillCount: z.number().int().nonnegative(),
  topics: z.array(TopicCountSchema),
  /** 手続き・形式を表すため政策トピックから除外したタグ(透明性のため件数ごと返す) */
  proceduralTags: z.array(z.object({ tag: z.string(), count: z.number().int().nonnegative() })),
  /** 会期の古い順 */
  sessions: z.array(SessionTopicsSchema),
  petitionCount: z.number().int().nonnegative(),
  petitionsByCommittee: z.array(CommitteeCountSchema),
});
export type TopicStats = z.infer<typeof TopicStatsSchema>;
