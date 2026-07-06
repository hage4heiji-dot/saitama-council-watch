# ADR-0010: Meeting.date と Bill.submittedDate をnullableにする

## ステータス
承認済み(2026-07-06、Phase1実装中に判明)

## コンテキスト
Phase1で「市長提出議案」ページ([[../design/01-basic-design.md]] ロードマップ参照)を実際にスクレイピングしたところ、以下が判明した。

- 議案は「定例会・臨時会」という会期単位でグループ化されており、会期そのものには単一の開催日が存在しない(開会日・閉会日にまたがる)
- 会期の正確な開会日・閉会日は別システム(会議日程一覧: `/gikai/002/teireirinji/kaiginitteiitiran/`)を追加調査しないと取得できない
- 議案の提出日は、詳細ページの見出し(例:「6月3日提出議案」)から解析できる場合が多いが、全ページが同じ書式とは限らない

もともとのPrismaスキーマは `Meeting.date` と `Bill.submittedDate` を両方NOT NULLとしていたが、これらを機械的に埋めようとすると、原本に明記されていない日付を推測で埋めることになり、
「元データが存在しない内容は生成禁止」([[../design/00-constitution.md]])というAIコンテンツ向けの原則にもとる(データ自体の性質は違うが、精神は同じ)。

## 決定
- `Meeting.date` をnullableにする。会期単位のMeeting行は当面`date = null`とし、`sessionName`のみで一意性を担保する(`@@unique([sessionName, meetingType])`)
- `Bill.submittedDate` をnullableにする。詳細ページの見出しから実際に解析できた場合のみ値を設定し、解析できない場合はnullのままにする(捏造しない)
- 個別の本会議・委員会の正確な開催日は、Phase1b(会議日程一覧のスクレイピング)で別途補完する

## 結果(Consequences)

**メリット**
- 実データの制約を無視して型を歪めることを避けられる。「値が入っていない」ことが「未取得」であることを型で表現できる
- 将来Phase1bで会議日程を追加スクレイピングした際、既存の`Meeting`行を`date`列だけ更新すればよく、モデル自体の作り直しが不要

**デメリット**
- 公開Web側(Phase2)で会議日程を表示する画面は、Phase1bの実装が終わるまで「日付不明」の会期が残る
- クエリ側(公開API)は`date`がnullの場合の表示を考慮する必要がある

**将来の拡張性**
- Phase1bで会議日程一覧(`/gikai/002/teireirinji/kaiginitteiitiran/`)をスクレイピングし、`sessionName`をキーに`Meeting.date`(または開会日・閉会日の追加カラム)を埋める
