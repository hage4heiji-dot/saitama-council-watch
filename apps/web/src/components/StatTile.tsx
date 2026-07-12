import Link from "next/link";

/**
 * 単一の現在値を見せるための最小単位(dataviz skill: 「単一の現在値」→Stat tile)。
 */
interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  /** 指定するとタイル全体がリンクになる(例: 議案ステータス別の一覧へ) */
  href?: string;
}

export function StatTile({ label, value, hint, href }: StatTileProps) {
  // 0件は実データ(1件以上)と同じ太字・濃色で出すと視覚的に同格に見えてしまうため、
  // 数値0のときだけ控えめな色にして「値があるタイル」を目立たせる。
  const isZero = typeof value === "number" && value === 0;
  const content = (
    <>
      <div className="text-sm text-ink-secondary">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${isZero ? "text-ink-muted" : "text-ink-primary"}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-hairline bg-surface-1 p-4 transition hover:bg-surface-page"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-lg border border-hairline bg-surface-1 p-4">{content}</div>;
}
