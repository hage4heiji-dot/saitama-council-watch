/**
 * 座標付きPDFテキスト解析で共通に使う、X座標のクラスタリングユーティリティ。
 * 表決態度PDF(docs/adr/0017)・予算表PDF(docs/adr/0024)のいずれも、
 * pdf-parseの既定のテキスト結合では失われる列位置を、X座標のまとまりから
 * 復元する必要があるため切り出した。
 */

/** x座標の値を、間隔(gapThreshold)より離れた点で区切ってクラスタリングする */
export function clusterByX(xs: number[], gapThreshold: number): number[] {
  const sorted = [...xs].sort((a, b) => a - b);
  const clusters: number[][] = [];
  for (const x of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && x - last[last.length - 1]! <= gapThreshold) {
      last.push(x);
    } else {
      clusters.push([x]);
    }
  }
  return clusters.map((cluster) => cluster.reduce((sum, v) => sum + v, 0) / cluster.length);
}

export function nearestCluster(x: number, clusters: number[]): number {
  return clusters.reduce((best, candidate) => (Math.abs(candidate - x) < Math.abs(best - x) ? candidate : best));
}
