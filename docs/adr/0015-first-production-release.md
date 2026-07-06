# ADR-0015: 初回本番リリースで発覚した不具合と対応

## ステータス
承認済み(2026-07-06)

## コンテキスト
`heijiseiji.ddns.net`(No-IPの無料動的DNS)を使い、Docker Composeで初めて本番相当のリリースを行った。この過程で、ローカル開発(`npm run dev`)では顕在化しなかった問題がいくつか見つかった。

## 決定事項

### 1. TypeScriptビルドが非.tsファイル(schema.sql)をdistにコピーしない
`tsc`は`.ts`ファイルのみをコンパイルし、`infrastructure/db/sqlite/schema.sql`のような同梱アセットは出力先(`dist/`)にコピーされない。開発時は`tsx`が`src/`を直接実行するため問題が表面化しなかったが、本番ビルド(`dist/`実行)ではSQLiteクライアントが起動時に`ENOENT`でクラッシュした。
→ `apps/api/package.json`の`build`スクリプトに`schema.sql`のコピー処理を追加した。

### 2. Docker名前付きボリュームでは証明書をホストのcertbotと共有できない
Phase0時点の`compose.yml`は`certbot_certs`/`certbot_webroot`を**名前付きボリューム**として定義していたが、証明書発行・更新は本番運用上ホスト側のcertbotで行う設計(`docs/adr/0003`)。名前付きボリュームはホストのファイルシステムパスと直接対応しないため、ホスト側certbotが書き込んだ証明書をnginxコンテナから参照できない。
→ `/etc/letsencrypt`と`/var/www/certbot`を**ホストパスの直接bindマウント**に変更した。

### 3. コンテナ非rootユーザーとホストbindマウントの所有権不一致
`apps/api/Dockerfile`はUID 10001の`appuser`で実行するが、ホスト側の`data/raw`・`data/sqlite`は`deploy`ユーザー(UID 1000)所有のままだったため、スクレイパーがPDF保存時に`EACCES`で失敗した。
→ ホスト側ディレクトリをコンテナのUID/GID(10001:999)に`chown`した。今後Dockerfileのユーザー定義を変更する場合はホスト側の所有権も合わせて見直すこと。

### 4. `/health`が公開ドメイン経由で到達できなかった
nginxの`location /api/`は`/api/`始まりのパスのみAPIコンテナへプロキシしており、APIの`/health`(ルート直下)は`location /`に落ちてNext.js側の404になっていた。
→ `location = /health`を追加し、APIコンテナへ明示的にプロキシするようにした。`/internal/*`(管理API)は意図的にプロキシ対象に含めていない(公開不要、docs/adr/0013)。

### 5. certbotの自動更新がstandalone認証のままだと本番運用で失敗する
初回発行は`certbot certonly --standalone`(ポート80が空いている前提)で行ったが、本番ではnginxが常時ポート80を占有するため、`certbot renew`のデフォルト設定(`authenticator = standalone`)のままでは自動更新時にポート競合で失敗する。
→ `/etc/letsencrypt/renewal/heijiseiji.ddns.net.conf`の`authenticator`を`webroot`に変更(nginx側の`/.well-known/acme-challenge/`ロケーションと整合)。`certbot renew --dry-run`で実際に成功することを確認済み。あわせて`/etc/letsencrypt/renewal-hooks/deploy/`に、更新成功後dockerのnginxへ`nginx -s reload`を送るフックを追加した。

## 結果(Consequences)

**メリット**
- 5つの不具合すべて、実際のリリース作業を通して発見・修正できた(ローカルdevでは発見できなかった種類の不具合)
- 証明書の自動更新まで含めてドライランで動作確認済み

**デメリット**
- `nginx/conf.d/default.conf`に実際のドメイン名(`heijiseiji.ddns.net`)を直接記述している。複数ドメイン対応や環境ごとの切り替えが必要になった場合はテンプレート化(envsubst等)を検討する(現時点はソロ運用の単一ドメインのためYAGNI)

**将来の拡張性**
- Dockerfileのユーザー定義(UID)を変更する際は、本ADRの§3を参照してホスト側ディレクトリの所有権も合わせて更新すること
- ドメインを追加・変更する場合は、nginx conf・renewal confの両方を更新する必要がある
