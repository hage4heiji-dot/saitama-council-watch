# スクレイパー(Phase 1で実装)

さいたま市議会公式サイトのスクレイピング実装をここに置く(docs/adr/0002-data-ingestion-scraping.md)。

- サイト構造への依存はこのディレクトリ配下に閉じ込め、domain層・application層に波及させない
- 取得したHTML/PDFは `infrastructure/storage/RawDocumentStorage.ts` で保存する
- robots.txt遵守、リクエスト間隔を空ける(politeness delay)ことを実装レベルで徹底する
- 差分検知はchecksum(sha256)ベースで行う(`DocumentRepository.findLatestBySourceUrl`)
