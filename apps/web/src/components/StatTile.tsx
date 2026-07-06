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
  const content = (
    <>
      <div className="text-sm text-ink-secondary">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-ink-primary">{value}</div>
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
