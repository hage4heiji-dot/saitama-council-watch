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
  const id = String(formData.get("id") ?? "");
  const verifiedBy = String(formData.get("verifiedBy") ?? "");
  const origin = resolvePublicOrigin(request);

  try {
    await verifyAiContent(token, id, verifiedBy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "承認に失敗しました";
    const url = new URL("/admin/review", origin);
    url.searchParams.set("token", token);
    url.searchParams.set("verifyError", message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(`/admin/review?token=${encodeURIComponent(token)}`, origin));
}
