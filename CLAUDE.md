# CLAUDE.md

このファイルはClaude Code向けの運用ガイドです。プロジェクトの原則そのものは `docs/design/00-constitution.md`、個別の設計判断は `docs/adr/` を参照してください。ここには「作業の進め方」を書きます。

## 実装〜リリースの手順

1. 対象サイト・データを実際に調査する(推測でスクレイパーを書かない)
2. 実装する
3. 実データで動作確認する(ローカルdev DB。可能なら実サイトに対しても)
4. 検証(下記「PRを出す前に」を参照)
5. featureブランチを切る → commit → push → PR作成
6. ユーザーの明示的な「マージする」を待ってからマージする
7. 本番へ反映する場合は「本番デプロイの手順」を参照

## PRを出す前に(必須)

```
npm run lint
npm run typecheck
npm run test
```

すべて通ることを確認してから開発ブランチをpushし、PRを作成する。`npm run test` は2026-07-07に追加した(下記「テストの方針」参照)。

## テストの方針

このリポジトリには自動テスト(Vitest, `apps/api`)がある。**パースロジックや条件分岐が複雑な純粋関数(ドメイン層)には回帰テストを書く**。実際にこの方針を導入するきっかけになったバグ:

- `apps/api/src/domain/bill/deliberationResult.ts`: PDFから抽出したテキストの議案番号と審査結果を対応付けるパーサー。件名中の「（第１号）」(予算の回次表記)を議案番号と誤認し、区間全体の対応がズレるバグが実データで見つかった → `deliberationResult.test.ts` で回帰テスト化。
- `apps/api/src/infrastructure/scraper/robotsCheck.ts`: robots.txtの`User-agent`グループを無視しており、他ボット向けの`Disallow`規則を自分たちにも誤って適用していた → `robotsCheck.test.ts` で回帰テスト化。

新しいスクレイパー・パーサー・条件分岐の多いドメインロジックを書いたら、同様にテストを追加すること。UIコンポーネントや薄いルーティング層まで無理に網羅する必要はない(YAGNI)。

## 本番デプロイの手順(必須・省略禁止)

**重要**: nginx/web/api/workerは同じ`docker compose`スタックの一部だが、独立にビルド・再起動できてしまう。**変更がAPIだけ/webだけに見えても、フロントエンドとバックエンドの型(`packages/shared-types`)は共有されているため、必ず変更のあった全サービスを揃えて再ビルド・再起動すること。** 「apiだけ再ビルドしてwebを忘れる」は実際に本番障害を起こした(旧webイメージが新しい`BillStatus`値を認識できずサーバーエラー)。迷ったら `web api worker` の3つとも再ビルドする。

**重要**: 本番VPSはメモリが1.92GBしかない。`docker compose build web api worker`のように複数サービスを一括ビルドすると、Next.js/tscのビルドプロセスが並列に走ってメモリを食い潰し、swapスラッシングでVPS全体がフリーズすることが実際にあった。**必ず1サービスずつ順番にビルドすること。**

```bash
cd /home/deploy/saitama-council-watch
git checkout main && git pull

# 変更されたサービスを"すべて"再ビルド(迷ったらweb api workerの3つとも)。
# 必ず1つずつ実行する(同時ビルドはメモリ不足でフリーズする実績あり)。
docker compose -f infra/docker/compose.yml --env-file .env build web
docker compose -f infra/docker/compose.yml --env-file .env build api
docker compose -f infra/docker/compose.yml --env-file .env build worker

# Prismaマイグレーションが追加されていれば適用(スキーマ変更がなければスキップ可)
docker compose -f infra/docker/compose.yml --env-file .env run --rm api npx prisma migrate deploy

# 再起動
docker compose -f infra/docker/compose.yml --env-file .env up -d web api worker

# nginxはweb/apiのコンテナIPを起動時に解決してキャッシュするため、
# web/apiを再作成した後は必ずnginxも再起動する(忘れると502になる。実際に発生済み)
docker compose -f infra/docker/compose.yml --env-file .env restart nginx

# スモークテスト(必須。自動テストでは検知できない「デプロイ漏れ」バグを実際のページ取得で検知する)
./infra/scripts/smoke-test.sh
```

`smoke-test.sh` が1件でも `NG` を返したら、デプロイ完了と報告しない。原因(古いイメージが残っている/マイグレーション未適用/nginxの名前解決キャッシュ/実装漏れ)を特定してから再試行する。

## 本番環境まわりの注意点(既出だが再掲)

- `data/raw` と `data/sqlite` は必ず `10001:999`(コンテナ内`appuser`のUID/GID)所有のままにする。リポジトリ全体を`chown -R deploy:deploy`した場合は、この2つのディレクトリだけ再度 `chown -R 10001:999 data/raw data/sqlite` すること(docs/adr/0009)。
- 本番の秘密情報はリポジトリルートの `.env`(gitignore済み)。値を`echo`や`cat`でそのまま標準出力に流さないこと。
