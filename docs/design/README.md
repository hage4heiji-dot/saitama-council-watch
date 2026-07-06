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

新しいADRを追加する場合は連番(0009〜)で作成し、この表と本README、関連する `01-basic-design.md` の該当箇所を更新すること。
