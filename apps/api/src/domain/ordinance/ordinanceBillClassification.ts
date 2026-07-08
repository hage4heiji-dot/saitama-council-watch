import { unwrapSenketsuTitle } from "../shared/senketsuTitle.js";

/**
 * 条例関連の議案(Bill.title)を、種別(制定/改正/廃止)で分類する(docs/adr/0025)。
 *
 * 「条例一覧」v1では、既存のBillをタイトルパターンで分類して一覧表示するだけに留める
 * (Ordinanceモデル(条例名ごとに現在の状態を追跡するレジストリ)は使わない)。理由:
 * 実データの取り込み開始が令和8年2月以降のため、「改正」議案の多くはそれより前に
 * 制定された条例を改正しており、本来の制定日が分からない。条例名の名寄せや
 * 「制定日」を推測で埋めるとdocs/design/00-constitution.mdの捏造禁止原則に反するため、
 * 実際に確認できる情報(議案そのものの提出日・審議結果)だけを表示する設計にした。
 *
 * 実データ(令和7〜8年度の条例関連議案44件)で確認したタイトル書式:
 *   - 制定(新規): "さいたま市いじめ問題救済委員会条例の制定について"
 *   - 改正:       "さいたま市国民健康保険税条例の一部を改正する条例の制定について"
 *                 "さいたま市教職員定数条例の一部改正について"(短縮形)
 *   - 廃止:       "さいたま市さいたま新都心バスターミナル条例を廃止する条例の制定について"
 *   - 専決処分:   "専決処分の報告及び承認を求めることについて（〇〇条例の一部を改正する条例の制定について）"
 */

export type OrdinanceBillKind = "enactment" | "amendment" | "abolition";

const ABOLITION_PATTERN = /を廃止する条例の制定について$/;
const AMENDMENT_PATTERN = /の一部(を改正する条例の制定について|改正について)$/;
const ENACTMENT_PATTERN = /条例の制定について$/;

/**
 * 条例に関する議案でない場合はnullを返す(捏造しない)。
 */
export function classifyOrdinanceBillKind(title: string): OrdinanceBillKind | null {
  if (!title.includes("条例")) {
    return null;
  }
  const targetTitle = unwrapSenketsuTitle(title);

  if (ABOLITION_PATTERN.test(targetTitle)) {
    return "abolition";
  }
  if (AMENDMENT_PATTERN.test(targetTitle)) {
    return "amendment";
  }
  if (ENACTMENT_PATTERN.test(targetTitle)) {
    return "enactment";
  }
  return null;
}
