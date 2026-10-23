import Link from "next/link";
import type { TopicStats } from "@saitama-council-watch/shared-types";
import { StatTile } from "@/components/StatTile";
import { fetchTopicStats } from "@/lib/apiClient";

export const metadata = { title: "統計(議題の傾向) | さいたま市議会ウォッチ" };

/** ワードクラウドに載せる最小件数(1件だけのトピックは約340種類あり、載せると読めなくなる) */
const CLOUD_MIN_COUNT = 2;
const RANKING_SIZE = 15;
const HEATMAP_TOPICS = 10;

function searchHref(tag: string): string {
  return `/search?${new URLSearchParams({ tag }).toString()}`;
}

/**
 * ワードクラウド。件数は文字の大きさ(面積ではなく平方根で縮めた文字サイズ)で表す。
 * 並び順は五十音順にして、位置が順位に見えないようにする(順位は下のランキングで正確に読める)。
 * 文字は色ではなく大きさ・太さで強弱を付ける(dataviz skill: テキストはテキスト色を使う)。
 */
function TopicCloud({ topics }: { topics: TopicStats["topics"] }) {
  const items = topics.filter((t) => t.count >= CLOUD_MIN_COUNT);
  const max = Math.max(...items.map((t) => t.count), 1);
  const min = Math.min(...items.map((t) => t.count), max);
  const sorted = [...items].sort((a, b) => a.topic.localeCompare(b.topic, "ja"));

  return (
    <div
      className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 rounded-lg border border-hairline bg-surface-1 px-6 py-8"
      aria-label="議題トピックのワードクラウド"
    >
      {sorted.map((t) => {
        const ratio = max === min ? 1 : (Math.sqrt(t.count) - Math.sqrt(min)) / (Math.sqrt(max) - Math.sqrt(min));
        const fontSize = 0.875 + ratio * 1.625; // 0.875rem 〜 2.5rem
        const strong = ratio >= 0.5;
        return (
          <Link
            key={t.topic}
            href={searchHref(t.searchTag)}
            title={`${t.topic}: ${t.count}件`}
            className={`leading-tight hover:underline ${strong ? "font-bold text-ink-primary" : ratio >= 0.2 ? "font-medium text-ink-primary" : "text-ink-secondary"}`}
            style={{ fontSize: `${fontSize}rem` }}
          >
            {t.topic}
          </Link>
        );
      })}
    </div>
  );
}

/** 上位トピックの件数ランキング(大小比較 → 横棒、単色) */
function TopicRanking({ topics }: { topics: TopicStats["topics"] }) {
  const top = topics.slice(0, RANKING_SIZE);
  const max = top[0]?.count ?? 1;

  return (
    <ol className="space-y-1.5">
      {top.map((t, index) => (
        <li key={t.topic}>
          <Link
            href={searchHref(t.searchTag)}
            title={`${t.topic}: ${t.count}件`}
            className="group grid grid-cols-[1.5rem_9rem_1fr_2.5rem] items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-surface-page"
          >
            <span className="text-right text-ink-muted">{index + 1}</span>
            <span className="truncate text-ink-primary group-hover:underline">{t.topic}</span>
            <span className="h-3 rounded-r bg-series-1" style={{ width: `${(t.count / max) * 100}%` }} />
            <span className="text-right text-ink-secondary">{t.count}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** ヒートマップのセル色(単色の濃淡3段階)。0件は塗らない */
function heatClass(count: number): string {
  if (count === 0) {
    return "text-ink-muted";
  }
  if (count <= 2) {
    return "bg-sequential-100 text-ink-primary";
  }
  if (count <= 5) {
    return "bg-sequential-250 text-ink-primary";
  }
  return "bg-sequential-450 font-semibold text-white";
}

/** 上位トピック × 会期のヒートマップ(会期ごとの話題の移り変わり) */
function SessionHeatmap({ stats }: { stats: TopicStats }) {
  const topics = stats.topics.slice(0, HEATMAP_TOPICS).map((t) => t.topic);
  const countsBySession = stats.sessions.map(
    (session) => new Map(session.topics.map((t) => [t.topic, t.count] as const)),
  );

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full border-separate border-spacing-0.5 text-sm">
          <thead>
            <tr className="text-left">
              <th className="sticky left-0 bg-surface-page px-2 py-2 font-medium">トピック</th>
              {stats.sessions.map((session) => (
                <th
                  key={session.meetingId}
                  title={session.sessionName}
                  className="whitespace-nowrap px-1 py-2 text-center text-xs font-medium text-ink-secondary"
                >
                  <Link href={`/meetings/${session.meetingId}`} className="hover:underline">
                    {/* 「令和7年12月（11月繰上げ）定例会」のような長い会期名で列幅が崩れるため、括弧書きは見出しから省く */}
                    {session.sessionName.replace(/[（(].*?[）)]/, "").replace("定例会", "")}
                  </Link>
                  <div className="font-normal text-ink-muted">{session.billCount}件</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic}>
                <th className="sticky left-0 whitespace-nowrap bg-surface-page px-2 py-1 text-left font-normal">
                  {topic}
                </th>
                {stats.sessions.map((session, i) => {
                  const count = countsBySession[i]?.get(topic) ?? 0;
                  return (
                    <td
                      key={session.meetingId}
                      title={`${session.sessionName} / ${topic}: ${count}件`}
                      className={`min-w-12 rounded px-1 py-1 text-center ${heatClass(count)}`}
                    >
                      {count === 0 ? "–" : count}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-secondary">
        <span>議案の件数:</span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-sequential-100" aria-hidden="true" />
          1〜2
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-sequential-250" aria-hidden="true" />
          3〜5
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-sequential-450" aria-hidden="true" />
          6以上
        </span>
      </div>
    </>
  );
}

/** 請願の付託委員会別件数(横棒、単色) */
function PetitionCommittees({ stats }: { stats: TopicStats }) {
  const max = stats.petitionsByCommittee[0]?.count ?? 1;
  return (
    <ul className="space-y-1.5">
      {stats.petitionsByCommittee.map((c) => (
        <li
          key={c.committee}
          title={`${c.committee}: ${c.count}件`}
          className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-2 px-1 text-sm"
        >
          <span className="truncate text-ink-primary">{c.committee}</span>
          <span className="h-3 rounded-r bg-series-1" style={{ width: `${(c.count / max) * 100}%` }} />
          <span className="text-right text-ink-secondary">{c.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage() {
  let stats: TopicStats | null = null;
  try {
    stats = await fetchTopicStats();
  } catch {
    stats = null;
  }

  if (!stats) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-4 text-xl font-bold">統計(議題の傾向)</h1>
        <p className="text-ink-muted">統計データを取得できませんでした。時間をおいて再度お試しください。</p>
      </main>
    );
  }

  const firstSession = stats.sessions[0];
  const lastSession = stats.sessions[stats.sessions.length - 1];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">統計(議題の傾向)</h1>
      <p className="mb-6 text-sm text-ink-muted">
        議案に付いたAIタグ(人が確認して承認したもののみ)から、どんな分野の議案が多いかを集計しています。
        {firstSession && lastSession && ` 対象: ${firstSession.sessionName}〜${lastSession.sessionName}。`}
        言葉をクリックすると、その議案の一覧に移動します。
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="議案" value={stats.billCount} hint={`うち分析対象 ${stats.taggedBillCount}件`} />
        <StatTile label="会期" value={stats.sessions.length} />
        <StatTile label="トピックの種類" value={stats.topics.length} />
        <StatTile label="請願" value={stats.petitionCount} href="/petitions" />
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">議題のワードクラウド</h2>
        <p className="mb-3 text-sm text-ink-muted">
          文字が大きいほど、そのトピックを含む議案が多いことを表します({CLOUD_MIN_COUNT}件以上のトピックのみ)。
        </p>
        <TopicCloud topics={stats.topics} />
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">多いトピック 上位{RANKING_SIZE}</h2>
        <TopicRanking topics={stats.topics} />
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-semibold">会期ごとの移り変わり</h2>
        <p className="mb-3 text-sm text-ink-muted">上位{HEATMAP_TOPICS}トピックが、各会期の議案にいくつ含まれていたか。</p>
        <SessionHeatmap stats={stats} />
      </section>

      {stats.petitionsByCommittee.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-semibold">市民からの請願(付託委員会別)</h2>
          <p className="mb-3 text-sm text-ink-muted">
            議案の多くは市長が提出するもののため、市民の関心は請願の方によく表れます。
            <Link href="/petitions" className="text-blue-600 hover:underline">
              請願一覧
            </Link>
            で件名を確認できます。
          </p>
          <PetitionCommittees stats={stats} />
        </section>
      )}

      <details className="rounded-lg border border-hairline bg-surface-1 p-4 text-sm">
        <summary className="cursor-pointer font-medium">集計方法</summary>
        <div className="mt-3 space-y-2 text-ink-secondary">
          <p>
            AIタグには「条例改正」「補正予算」「人事案件」のように議案の形式を表す語が多く含まれ、そのまま数えると
            内容の傾向が見えなくなるため、以下の語はトピックから除外しています。
          </p>
          <p className="text-ink-muted">
            {stats.proceduralTags.map((t) => `${t.tag}(${t.count})`).join("、")}
          </p>
          <p>
            また「道路法」「道路認定」→「道路」のように表記ゆれ・細かすぎるタグは1つのトピックにまとめ、
            1つの議案の中で同じトピックに当たるタグは1件として数えています。
          </p>
        </div>
      </details>
    </main>
  );
}
