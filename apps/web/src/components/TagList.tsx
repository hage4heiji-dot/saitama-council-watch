import Link from "next/link";

interface TagListProps {
  tags: string[];
  /** タグクリック時のリンク先を指定する関数。省略時はリンクにしない(プレーン表示) */
  hrefForTag?: (tag: string) => string;
}

/** 議案のタグをバッジ表示する(議案一覧・検索結果・議案詳細で共通利用) */
export function TagList({ tags, hrefForTag }: TagListProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {tags.map((tag) =>
        hrefForTag ? (
          <Link
            key={tag}
            href={hrefForTag(tag)}
            className="rounded-full bg-sequential-100 px-2.5 py-0.5 text-xs text-ink-primary hover:bg-sequential-250"
          >
            {tag}
          </Link>
        ) : (
          <span key={tag} className="rounded-full bg-sequential-100 px-2.5 py-0.5 text-xs text-ink-primary">
            {tag}
          </span>
        ),
      )}
    </div>
  );
}
