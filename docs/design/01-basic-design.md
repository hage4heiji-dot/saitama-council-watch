# 基本設計書 v1.0(承認済み)

前提: [[00-constitution.md]](プロジェクト憲法)、[[../adr/]](各設計判断のADR)

本ドキュメントは2026-07-06の設計レビューで承認された基本設計の確定版。以降の実装(Phase 0〜)は本ドキュメントとADR群に従うこと。

---

## 1. システム全体設計

### 採用アーキテクチャ: モジュラーモノリス + ヘキサゴナル(ポート&アダプタ)
根拠: [[../adr/0001-architecture-style]]

```
                         ┌───────────────────────────┐
                         │        Nginx (TLS)        │
                         └─────────────┬─────────────┘
                    ┌───────────────────┴───────────────────┐
                    ▼                                        ▼
          ┌───────────────────┐                   ┌───────────────────────┐
          │  Next.js (apps/web)│  ← REST/JSON →   │  Express API (apps/api)│
          └───────────────────┘                   └───────────┬───────────┘
                                                                │
                              ┌─────────────────────────────────┼─────────────────────────┐
                              ▼                                 ▼                         ▼
                    ┌─────────────────┐               ┌──────────────────┐      ┌──────────────────┐
                    │ Domain層         │               │ Application層     │      │ Infrastructure層  │
                    │ (Entity/Repo I/F)│◀──────────────│ (UseCase/Service) │─────▶│ Prisma/AI/Scraper │
                    └─────────────────┘               └──────────────────┘      │ の各アダプタ        │
                                                                                  └─────────┬──────────┘
                              ┌───────────────────────────────────────────────────────────────┤
                              ▼                             ▼                                ▼
                     ┌────────────────┐          ┌────────────────────┐              ┌────────────────┐
                     │  PostgreSQL    │          │  SQLite(技術キャッシュ)│              │ 原本ファイル群    │
                     │ (永続業務データ  │          │ (embedding/FTS/    │              │ (PDF/HTML/MD/JSON)│
                     │  + 公開AIコンテンツ)│         │  LLM応答キャッシュ)  │              │                  │
                     └────────────────┘          └────────────────────┘              └────────────────┘
                              ▲
                     ┌────────┴─────────┐
                     │ worker(別コンテナ) │  ← ADR-0008
                     │ (scrape→parse→AI) │
                     └────────┬──────────┘
                              ▼
                     Claude API(要約/分類/タグ/FAQ)
```

DB・AI・スクレイパーはすべてポート(interface)経由でアクセスし、実装(Prisma、Claude API、サイト構造依存のスクレイパー)はアダプタとして差し替え可能。

バッチはジョブキュー(BullMQ+Redis)を今は導入しない([[../adr/0005-scale-assumption]]、YAGNI)。`node-cron`ベースの`worker`コンテナ([[../adr/0008-worker-container-separation]])で十分。

---

## 2. ディレクトリ構成

```
saitama-council-watch/
├── apps/
│   ├── web/                          # Next.js
│   │   └── src/{app, features, components, lib}/
│   ├── api/                          # Express(HTTPリクエスト処理専任)
│   │   ├── src/
│   │   │   ├── domain/               # Entity, Value Object, Repository interface
│   │   │   ├── application/          # UseCase
│   │   │   ├── infrastructure/
│   │   │   │   ├── db/postgres/      # Prisma実装Repository
│   │   │   │   ├── db/sqlite/        # embedding/FTS/LLMキャッシュ実装
│   │   │   │   ├── ai/               # Claude APIクライアント、プロンプトテンプレート
│   │   │   │   ├── scraper/          # サイト別スクレイパー
│   │   │   │   └── storage/          # 原本ファイル保存アダプタ
│   │   │   ├── interfaces/http/      # controller, route, DTO(zod)
│   │   │   ├── batch/                # ジョブ定義(workerから起動)
│   │   │   └── config/
│   │   └── prisma/{schema.prisma, migrations/}
│   └── worker/                       # apiと同一コードベース、起動コマンドのみ別(ADR-0008)
├── packages/
│   └── shared-types/                 # zodスキーマ由来の型をFE/BE共有
├── data/
│   ├── raw/                          # 原本(PDF/HTML/MD/JSON)。追記専用
│   └── sqlite/                       # SQLiteファイル本体(技術キャッシュのみ)
├── infra/
│   ├── docker/                       # Dockerfile, compose.yml, nginx conf
│   └── scripts/                      # デプロイ/バックアップスクリプト
└── docs/
    ├── adr/                          # 本設計に至った意思決定記録
    └── design/                       # 本ドキュメント群
```

ツール: npm/pnpm workspaces。Turborepo/Nxは導入しない(この規模では設定コストが利益を上回る)。

---

## 3. DB設計

### 3.1 PostgreSQL(永続業務データ + 公開AIコンテンツ)主要テーブル

| テーブル | 主なカラム | 備考 |
|---|---|---|
| `legislators`(議員) | id, name, name_kana, first_elected_date, is_active, profile_url | |
| `factions`(会派) | id, name, founded_date, is_active | |
| `legislator_faction_history` | legislator_id, faction_id, valid_from, valid_to | 会派移動の履歴を保持 |
| `meetings`(会議) | id, name, meeting_type, session_name, start_date(nullable), end_date(nullable), status | [[../adr/0010-nullable-session-and-bill-dates]], [[../adr/0011-session-schedule-scraping]] |
| `bills`(議案) | id, meeting_id, bill_number, title, category, submitted_date(nullable), status, source_document_id | |
| `ordinances`(条例) | id, title, enacted_date, bill_id(nullable), status, source_document_id | |
| `votes`(投票結果) | id, bill_id, legislator_id, vote_type, voted_at | 複合ユニーク(bill_id, legislator_id) |
| `budgets`(予算) | id, fiscal_year, category, amount, related_bill_id, description | |
| `documents`(原本管理) | id, type, source_url, storage_path, checksum(sha256), fetched_at, version | 追記専用・immutable |
| `ai_contents`(AI生成コンテンツ) | id, source_document_id(**NOT NULL FK**), content_type(summary/tags/faq), body, model_version, prompt_version, generated_at, is_verified, verified_by, verified_at | [[../adr/0006-ai-content-storage-split]] |
| `users` | id, oauth_provider, oauth_subject_id, email, display_name | |
| `notification_settings` | id, user_id, channel, topic_filter(JSON), is_enabled | |
| `batch_job_runs` | id, job_name, started_at, finished_at, status, error_message, records_processed | §7参照 |

**原則**: `documents`は追記専用。サイト内容が更新されたら新しい`version`の行を追加し、古い版も保持する(説明責任のため上書きしない)。`ai_contents.source_document_id`はNOT NULL制約とし、原本なきAI生成をDB制約レベルで禁止する。

### 3.2 SQLite(技術的キャッシュ専用)
根拠: [[../adr/0006-ai-content-storage-split]]

- Embeddingベクトル(`sqlite-vec`拡張)
- 全文検索インデックス(FTS5、Postgresの本文をミラー)
- LLM応答キャッシュ(原本テキストのハッシュをキー)
- スクレイピング/パースの中間状態

業務データは一切持たない。全て「Postgres + 原本ファイルから再生成可能」なキャッシュ層。

---

## 4. API設計

- ベースパス: `/api/v1/...`
- エラー形式: `application/problem+json`(RFC7807)
- 権限レベル3層:
  - 公開読み取り系(認証不要): `/legislators`, `/meetings`, `/bills`, `/ordinances`, `/votes`, `/budgets`, `/search`
  - ユーザー系(OAuth必須): `/me`, `/me/notification-settings`
  - 内部/管理系(外部非公開): `/internal/batch/trigger`, `/admin/ai-contents/:id/verify`
- 入力検証: zod、スキーマは`packages/shared-types`でFE/BE共有
- 一覧系: カーソルベースページネーション(初期から採用、[[../adr/0005-scale-assumption]])
- レート制限: Nginx層 + API層の二重

---

## 5. データフロー

```
① 公式サイト
   └▶ ② スクレイパー(URLごとにchecksum比較で差分検知)
        └▶ ③ 原本保存(data/raw + documents行、version採番)
             └▶ ④ パーサー/正規化(PDF/HTML→構造化テキスト)
                  └▶ ⑤ Postgresへupsert(status=draft)
                       └▶ ⑥ AIパイプライン起動(document単位)
                            └▶ ⑦ Claude API(原本テキストのみを入力)
                                 └▶ ⑧ グラウンディング検証(§6.2)
                                      └▶ ⑨ ai_contents保存(is_verified=false)
                                           └▶ ⑩ 管理画面で人手確認 → is_verified=true
                                                └▶ ⑪ 公開Web表示(原本PDFへのリンク必須併記)
```

⑩の人手確認ゲートは [[../adr/0007-ai-human-review-gate]] により採用。新規/更新分のみの差分確認とし、全件確認は行わない。

---

## 6. AIフロー

### 6.1 プロンプト設計の原則
- システムプロンプトで役割を「情報整理者」に固定し、「与えられたテキスト以外の知識を使用しない」「原本にない事実を追加しない」ことを明示
- 出力は構造化出力(要約、タグ配列、FAQ配列、引用箇所)を強制し、パース失敗時はリトライ
- `model_version` / `prompt_version` を必ず記録(モデル更新時の差分検証・再生成・監査のため)

### 6.2 グラウンディング(創作防止)の二段構え
1. 機械的チェック: 出力中の固有名詞・数値が原本テキストに存在するかを突合
2. 自己検証パス: 別セッションのClaude呼び出しで「この要約は原文だけで裏付けられるか。裏付けのない主張があれば列挙せよ」と問い直す。フラグが立てば人手確認(§5 ⑩)に優先的に回す

### 6.3 埋め込み・関連情報抽出
- 埋め込みベクトルはSQLite(`sqlite-vec`)に保存
- 将来的にデータ量・検索精度が問題になれば PostgreSQL + `pgvector` へ移行([[../adr/0006-ai-content-storage-split]] 将来の拡張性)

### 6.4 コスト制御
- 原本テキストのハッシュをキーにLLM応答をSQLiteにキャッシュし、同一内容への再呼び出しを防止

---

## 7. バッチ設計

`worker`コンテナ内の`node-cron`によるスケジュールジョブ([[../adr/0008-worker-container-separation]]):

| ジョブ | 頻度目安 | 冪等性の担保 |
|---|---|---|
| スクレイパー | 1日数回 | URL×checksumで差分なければスキップ |
| パーサー/正規化 | スクレイパー後即時 | 自然キーでupsert |
| AIパイプライン | 新規/更新documentに対し即時 | document_idごとに1回、再実行時はキャッシュ利用 |
| 通知ディスパッチ | 1日1回(ダイジェスト) | 送信済みログで二重送信防止 |
| ハウスキーピング | 週1回 | SQLiteキャッシュ剪定、ログローテーション |

実行履歴は`batch_job_runs`(Postgres)に記録。失敗時はメール通知チャネルを再利用してアラート送信。Prometheus/Grafana等の本格監視基盤は現段階では導入しない([[../adr/0005-scale-assumption]]、YAGNI)。

---

## 8. セキュリティ設計

- **Nginx**: Let's Encrypt(certbot自動更新)でTLS終端、`limit_req`でレート制限、サーバートークン非表示
- **Express**: `helmet`、CORSは自ドメインのみ許可、全入力をzodで検証、Prismaでパラメータ化クエリ(SQLi対策標準)
- **認証**: 実績あるライブラリ(Auth.js等)を利用、自前実装しない([[../adr/0004-auth-oauth-multichannel-notification]])。セッションCookieは`httpOnly`/`secure`/`sameSite=lax`
- **シークレット管理**: `.env`はgit管理外、Claude APIキー/DB認証情報はDocker環境変数経由
- **最小権限**: アプリ用Postgresロールは必要な権限のみ(スーパーユーザー権限を持たせない)
- **バックアップ**: `pg_dump`を毎日実行しVPS外へ転送(SPOF対策、[[../adr/0003-hosting-single-vps-docker]])。原本ファイルも同様。SQLiteは再生成可能なため優先度は下げる([[../adr/0006-ai-content-storage-split]])
- **スクレイピング倫理/法務**: robots.txt遵守、リクエスト間隔を空ける、`source_url`と取得日時を保持し出典表示を徹底([[../adr/0002-data-ingestion-scraping]])
- **監査ログ**: `ai_contents`の`verified_by`/`verified_at`など、管理者操作は行為者・日時を記録
- **依存関係の健全性**: Renovate/Dependabotで5年運用を見据えた継続的パッチ適用

---

## 9. Docker構成

```yaml
# infra/docker/compose.yml (概念構成)
services:
  nginx:      # TLS終端、リバースプロキシ。ホストに公開する唯一のサービス
  web:        # Next.js本番ビルド(multi-stage Dockerfile)
  api:        # Express(HTTPリクエスト処理専任)
  worker:     # apiと同一イメージ、起動コマンドのみ変更してバッチ専任プロセスとして分離(ADR-0008)
  postgres:   # 永続ボリュームpostgres_data
```

- ボリューム: `postgres_data`(named volume)、`data/raw`と`data/sqlite`はホストパスのバインドマウント(バックアップスクリプトから直接アクセスしやすくするため)
- ネットワーク: 内部ブリッジネットワークのみ、`nginx`以外はホストに公開しない
- Dockerfileはマルチステージビルドで本番イメージを最小化

---

## 10. 開発ロードマップ

| フェーズ | 内容 | 狙い |
|---|---|---|
| Phase 0 | リポジトリ雛形、Docker Compose骨格、Prisma初期スキーマ、VPS初期構築、TLS設定 | 土台を先に固め、以降の手戻りを防ぐ |
| Phase 1 | スクレイパー(会議録・議案の1〜2種類)、パーサー、Postgres投入までを疎通確認 | AI抜きでまずデータ基盤の信頼性を検証 |
| Phase 2 | 公開Webサイト最小版(議員一覧・会議録・議案一覧、原本PDFリンク、SQLite FTS5全文検索) | 「行政データを見やすくする」価値を最速で提供 |
| Phase 3 | AIパイプライン(要約・分類・タグ・FAQ)+ グラウンディング検証 + 管理確認画面 | プロダクトの核となるAI価値を、安全策込みで投入 |
| Phase 4 | OAuthログイン、通知設定、通知バッチ | ユーザー機能で継続利用の動機づけ |
| Phase 5 | 埋め込みによる関連情報抽出、予算/投票結果の可視化、会派比較 | 差別化機能の拡充 |
| Phase 6 | バックアップ検証、障害アラート整備、パフォーマンスチューニング、ADR整理 | 5年運用に耐える運用体制の完成 |

---

## 変更履歴

| 日付 | 内容 |
|---|---|
| 2026-07-06 | 初版承認。ADR-0006〜0008(SQLite/Postgres分担、人手確認ゲート、worker分離)を反映した確定版 |
