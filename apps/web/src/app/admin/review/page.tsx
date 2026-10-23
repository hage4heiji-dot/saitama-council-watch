import { fetchPendingAiContents } from "@/lib/apiClient";

export const metadata = { title: "AIコンテンツ確認(管理) | さいたま市議会ウォッチ" };

interface AdminReviewPageProps {
  searchParams: Promise<{ token?: string; verifyError?: string }>;
}

export default async function AdminReviewPage({ searchParams }: AdminReviewPageProps) {
  const { token, verifyError } = await searchParams;

  if (!token) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="mb-4 text-xl font-bold">管理トークンを入力</h1>
        <form action="/admin/review" method="get" className="flex gap-2">
          <input
            type="password"
            name="token"
            placeholder="ADMIN_API_TOKEN"
            className="flex-1 rounded border border-gray-300 px-3 py-2"
          />
          <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
            開く
          </button>
        </form>
      </main>
    );
  }

  let items: Awaited<ReturnType<typeof fetchPendingAiContents>>["items"] = [];
  let error: string | null = null;
  try {
    const response = await fetchPendingAiContents(token);
    items = response.items;
  } catch {
    error = "トークンが正しくないか、APIに接続できませんでした。";
  }

  // 自己検証で「要確認」が付いたものは優先的に人手確認する方針(docs/adr/0007)のため、
  // 一括承認の対象から外し、個別承認のみとする。
  const bulkTargets = items.filter((item) => !item.aiContent.groundingNote);
  const flaggedCount = items.length - bulkTargets.length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">AIコンテンツ確認(未承認 {items.length}件)</h1>
      <p className="mb-6 text-sm text-gray-500">
        承認するとis_verified=trueとなり、公開Webに表示されます(docs/adr/0007)。
      </p>
      {error && <p className="mb-4 text-red-600">{error}</p>}
      {verifyError && <p className="mb-4 text-red-600">承認に失敗しました: {verifyError}</p>}
      {bulkTargets.length > 0 && (
        <form
          action="/admin/review/verify"
          method="post"
          className="mb-6 rounded border border-gray-200 bg-gray-50 p-4"
        >
          <input type="hidden" name="token" value={token} />
          {bulkTargets.map((item) => (
            <input key={item.aiContent.id} type="hidden" name="id" value={item.aiContent.id} />
          ))}
          <p className="mb-2 text-sm text-gray-700">
            表示中の{bulkTargets.length}件をまとめて承認します。
            {flaggedCount > 0 && `「要確認」の${flaggedCount}件は対象外です(個別に確認してください)。`}
          </p>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" required />
            対象の内容をすべて原本と照らして確認しました
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              name="verifiedBy"
              placeholder="確認者名"
              required
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
            <button type="submit" className="rounded bg-green-700 px-3 py-1 text-sm text-white">
              {bulkTargets.length}件をまとめて承認して公開する
            </button>
          </div>
        </form>
      )}
      <ul className="divide-y divide-gray-200">
        {items.map((item) => (
          <li key={item.aiContent.id} className="py-4">
            <div className="mb-1 text-sm text-gray-500">
              {item.billNumber} {item.billTitle}
            </div>
            <div className="mb-1 text-xs uppercase text-gray-400">{item.aiContent.contentType}</div>
            <div className="mb-2 whitespace-pre-wrap">{item.aiContent.body}</div>
            {item.aiContent.groundingNote && (
              <div className="mb-2 rounded bg-yellow-50 p-2 text-sm text-yellow-800">
                要確認: {item.aiContent.groundingNote}
              </div>
            )}
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              原本PDF
            </a>
            <form action="/admin/review/verify" method="post" className="mt-2 flex gap-2">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="id" value={item.aiContent.id} />
              <input
                type="text"
                name="verifiedBy"
                placeholder="確認者名"
                required
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button type="submit" className="rounded bg-green-700 px-3 py-1 text-sm text-white">
                承認して公開する
              </button>
            </form>
          </li>
        ))}
        {items.length === 0 && !error && (
          <li className="py-4 text-gray-500">未承認のAIコンテンツはありません。</li>
        )}
      </ul>
    </main>
  );
}
