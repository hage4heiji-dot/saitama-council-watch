import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-bold">さいたま市議会ウォッチ</h1>
      <p className="text-gray-600">
        行政・議会・政治を、市民にわかりやすく整理・可視化するプラットフォームです。
        現在は議員一覧・会議(定例会・臨時会)・議案の掲載までを提供しています。
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/legislators"
          className="rounded border border-gray-300 px-4 py-3 hover:bg-gray-50"
        >
          議員一覧を見る
        </Link>
        <Link href="/meetings" className="rounded border border-gray-300 px-4 py-3 hover:bg-gray-50">
          会議・議案を見る
        </Link>
        <Link href="/search" className="rounded border border-gray-300 px-4 py-3 hover:bg-gray-50">
          議案を検索する
        </Link>
      </div>
    </main>
  );
}
