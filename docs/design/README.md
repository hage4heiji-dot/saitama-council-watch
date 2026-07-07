# 設計ドキュメント索引

新しいセッション/エージェントがこのプロジェクトを引き継ぐ場合、次の順で読むこと。読めば、なぜ今の設計になっているかをゼロから再現・検証できる。

1. [00-constitution.md](./00-constitution.md) — プロジェクト憲法(不変の制約・AIの役割・技術スタック)
2. [../adr/](../adr/) — 各設計判断の背景・検討した代替案・結論(ADR 0001〜0008)
3. [01-basic-design.md](./01-basic-design.md) — 確定した基本設計(システム全体設計〜開発ロードマップの10項目)

## ADR一覧

| # | タイトル |
|---|---|
| [0001](../adr/0001-architecture-style.md) | モジュラーモノリス + ヘキサゴナルアーキテクチャの採用 |
| [0002](../adr/0002-data-ingestion-scraping.md) | データ取得はさいたま市議会公式サイトのスクレイピング |
| [0003](../adr/0003-hosting-single-vps-docker.md) | 単一VPS(Ubuntu 24.04)+ Docker運用 |
| [0004](../adr/0004-auth-oauth-multichannel-notification.md) | 認証はOAuth、通知は複数チャネル対応 |
| [0005](../adr/0005-scale-assumption.md) | 小規模スタート、ただし拡張性を犠牲にしない |
| [0006](../adr/0006-ai-content-storage-split.md) | 公開用AI生成コンテンツはPostgreSQL、技術的キャッシュのみSQLite |
| [0007](../adr/0007-ai-human-review-gate.md) | AI生成コンテンツの公開前に人手確認ゲートを設ける |
| [0008](../adr/0008-worker-container-separation.md) | バッチ/AI処理をworkerコンテナとしてAPIから分離 |
| [0009](../adr/0009-non-root-deploy-user.md) | 非rootの専用デプロイユーザーでプロジェクトを配置・運用する |
| [0010](../adr/0010-nullable-session-and-bill-dates.md) | Meeting.dateとBill.submittedDateをnullableにする |
| [0011](../adr/0011-session-schedule-scraping.md) | 会期予定表スクレイピングによるMeeting開始日・終了日の補完(Phase1b) |
| [0012](../adr/0012-phase2-public-site-decisions.md) | Phase2(公開Webサイト最小版)における設計判断 |
| [0013](../adr/0013-phase3-ai-pipeline.md) | Phase3(AIパイプライン)の設計判断 |
| [0014](../adr/0014-design-system.md) | 公開サイトのデザインシステム導入 |
| [0015](../adr/0015-first-production-release.md) | 初回本番リリースで発覚した不具合と対応 |
| [0016](../adr/0016-bill-deliberation-status-sync.md) | 議案審議結果の同期(資料検索システムからのBill.status反映) |
| [0017](../adr/0017-bill-vote-stance-ingestion.md) | 議案表決態度(議員別賛否)の取り込み |
| [0018](../adr/0018-tag-filtering-and-latest-session-scoping.md) | タグによる議案の絞り込み・表示と、ホーム画面の最新会期スコープ化 |
| [0019](../adr/0019-legislator-tag-cross-tab.md) | 議員×タグ クロス集計ページの追加 |

新しいADRを追加する場合は連番(0020〜)で作成し、この表と本README、関連する `01-basic-design.md` の該当箇所を更新すること。
