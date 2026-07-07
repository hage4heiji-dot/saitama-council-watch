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
 */
export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const id = String(formData.get("id") ?? "");
  const verifiedBy = String(formData.get("verifiedBy") ?? "");

  try {
    await verifyAiContent(token, id, verifiedBy);
  } catch (error) {
    const message = error instanceof Error ? error.message : "承認に失敗しました";
    const url = new URL("/admin/review", request.url);
    url.searchParams.set("token", token);
    url.searchParams.set("verifyError", message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(`/admin/review?token=${encodeURIComponent(token)}`, request.url));
}
