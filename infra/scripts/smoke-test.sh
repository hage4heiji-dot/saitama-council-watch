#!/usr/bin/env bash
# デプロイ後のスモークテスト(リグレッションテストの一環)。
#
# 経緯: api/workerだけを再ビルドしてwebコンテナの再ビルドを忘れたため、
# 新しいBillStatus値(unconfirmed)を古いwebイメージのStatusBadgeが認識できず、
# 該当議案を含む会期の詳細画面がサーバーエラーになる障害が起きた。
# 自動テスト(npm run test)では検知できない「コードは正しいがデプロイが古い」
# というクラスの不具合を、実際にページを叩いて検知する。
#
# 使い方:
#   ./infra/scripts/smoke-test.sh                          # 本番(https://heijiseiji.ddns.net)
#   ./infra/scripts/smoke-test.sh http://localhost:3000     # 任意の環境

set -euo pipefail

BASE_URL="${1:-https://heijiseiji.ddns.net}"
FAILURES=0

check() {
  local path="$1"
  local url="${BASE_URL}${path}"
  local status
  status="$(curl -s -o /tmp/smoke-test-body.html -w '%{http_code}' "$url")"
  if [ "$status" != "200" ]; then
    echo "NG  ${status}  ${path}"
    FAILURES=$((FAILURES + 1))
    return
  fi
  # Next.jsのエラーページはbody中に digest/Application error 等の文言を含むため200でも検知する
  if grep -qi "Application error\|Internal Server Error" /tmp/smoke-test-body.html; then
    echo "NG  200(ただしエラー画面)  ${path}"
    FAILURES=$((FAILURES + 1))
    return
  fi
  echo "OK  ${status}  ${path}"
}

echo "==> smoke test against ${BASE_URL}"

check "/"
check "/legislators"
check "/meetings"
check "/search?q=%E8%AD%B0%E6%A1%88"

# 会議一覧APIから実在するmeeting idを取得し、詳細画面を実データで検証する
# (これがまさに今回の障害を検知できるチェック)
MEETING_ID="$(curl -s "${BASE_URL}/api/v1/meetings?limit=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)"
if [ -n "$MEETING_ID" ]; then
  check "/meetings/${MEETING_ID}"
else
  echo "SKIP  会議データが取得できなかったため /meetings/{id} は確認できません"
fi

# 議案ステータス別一覧(全ステータスを実際にレンダリングして確認)
for status in submitted in_deliberation passed rejected carried_over unconfirmed; do
  check "/bills?status=${status}"
done

rm -f /tmp/smoke-test-body.html

echo "==> ${FAILURES} failure(s)"
exit $((FAILURES > 0 ? 1 : 0))
