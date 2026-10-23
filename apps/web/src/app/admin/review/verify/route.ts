import { NextResponse } from "next/server";
import { verifyAiContent } from "@/lib/apiClient";

/**
 * 管理確認画面(/admin/review)の承認フォームの送信先(Phase3)。
 * 素のHTMLフォームからPOSTされ、サーバー側でx-admin-tokenを付けて
 * internal APIを呼ぶことで、ブラウザからトークンヘッダを直接送らずに済む。
 *
 * internal API呼び出しの失敗(確認者名未入力・トークン誤り・対象なし等)を
 * 捕捉せずにいたため、Next.jsの素の500エラー画面になってしまっていた
 * (実際の障害報告により発覚)。理由を画面に表示できるよう、失敗時は
 * エラーメッセージ付きで/admin/reviewへリダイレクトする。
 *
 * リダイレクト先URLは`request.url`ではなくnginxが転送するHost/X-Forwarded-Protoヘッダから
 * 組み立てる。本番環境(nginxリバースプロキシ配下のNext.js standaloneサーバー)で
 * `request.url`のoriginがDockerコンテナの内部ホスト名になってしまい、
 * リダイレクト後に「このサイトにアクセスできません」となる不具合が実際に発生した。
 */
function resolvePublicOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  // 個別承認は1件、一括承認は画面に表示していた件数ぶん`id`が送られてくる。
  // 一括承認でもサーバー側で「現在の未承認すべて」を取り直さず、画面表示時点のIDだけを
  // 承認する(表示後に追加された未確認コンテンツが人手確認なしに公開されるのを防ぐ。docs/adr/0007)。
  const ids = formData.getAll("id").map(String).filter((id) => id !== "");
  const verifiedBy = String(formData.get("verifiedBy") ?? "");
  const origin = resolvePublicOrigin(request);

  const failures: string[] = [];
  if (ids.length === 0) {
    failures.push("承認対象がありません");
  }
  for (const id of ids) {
    try {
      await verifyAiContent(token, id, verifiedBy);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : "承認に失敗しました");
    }
  }

  if (failures.length > 0) {
    const url = new URL("/admin/review", origin);
    url.searchParams.set("token", token);
    url.searchParams.set(
      "verifyError",
      ids.length > 1 ? `${ids.length}件中${failures.length}件: ${failures[0]}` : (failures[0] ?? ""),
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(`/admin/review?token=${encodeURIComponent(token)}`, origin));
}
