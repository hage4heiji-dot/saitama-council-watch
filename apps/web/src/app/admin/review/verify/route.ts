import { NextResponse } from "next/server";
import { verifyAiContent } from "@/lib/apiClient";

/**
 * 管理確認画面(/admin/review)の承認フォームの送信先(Phase3)。
 * 素のHTMLフォームからPOSTされ、サーバー側でx-admin-tokenを付けて
 * internal APIを呼ぶことで、ブラウザからトークンヘッダを直接送らずに済む。
 */
export async function POST(request: Request): Promise<NextResponse> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const id = String(formData.get("id") ?? "");
  const verifiedBy = String(formData.get("verifiedBy") ?? "");

  await verifyAiContent(token, id, verifiedBy);

  return NextResponse.redirect(new URL(`/admin/review?token=${encodeURIComponent(token)}`, request.url));
}
