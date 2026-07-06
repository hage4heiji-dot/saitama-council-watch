# さいたま市議会ウォッチ

市民が行政・議会・政治を分かりやすく理解できるよう、行政データをAIが整理・可視化するプラットフォーム。

## 設計ドキュメント

実装より先に、必ず以下を読むこと。

- [docs/design/00-constitution.md](docs/design/00-constitution.md) — プロジェクト憲法(不変の原則・AIの役割制約)
- [docs/adr/](docs/adr/) — 各設計判断の背景・代替案・結論(ADR)
- [docs/design/01-basic-design.md](docs/design/01-basic-design.md) — 確定した基本設計

## モノレポ構成

```
apps/web        Next.js フロントエンド
apps/api        Express バックエンド(HTTP処理 / batchジョブ両方の起点)
packages/shared-types  FE/BE共有のzod型定義
infra/docker    Docker Compose, Dockerfile, nginx設定
infra/scripts   VPSプロビジョニング・バックアップ等の運用スクリプト
data/raw        スクレイピングした原本(PDF/HTML/MD/JSON)
data/sqlite     AI専用の技術的キャッシュ(embedding/FTS/LLM応答キャッシュ)
```

## セットアップ(開発)

```bash
npm install
cp .env.example .env   # 値を埋める
npm run --workspace apps/api prisma:generate
npm run dev:api
npm run dev:web
```

## ライセンス/データ出典

原本データはさいたま市議会公式サイトから取得しています([[docs/adr/0002-data-ingestion-scraping.md]])。各ページに出典・取得日時を明記します。
