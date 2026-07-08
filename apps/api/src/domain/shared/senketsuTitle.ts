/**
 * 「専決処分の報告及び承認を求めることについて（〇〇）」形式のタイトルから、
 * 中身(〇〇)を取り出す。専決処分(市長が緊急に単独で行い、後から議会の承認を
 * 求める手続き)は、予算・条例のいずれの議案でもこの形式で包まれることがある
 * (docs/adr/0024の予算議案分類ロジックで最初に見つかったパターンを共通化)。
 */
const SENKETSU_WRAPPER_PATTERN = /^専決処分の報告及び承認を求めることについて[（(](.+)[）)]$/;

export function unwrapSenketsuTitle(title: string): string {
  const match = SENKETSU_WRAPPER_PATTERN.exec(title);
  return match?.[1] ?? title;
}
