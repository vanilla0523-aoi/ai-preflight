import type { Detection } from "./types";

/**
 * Safe Prompt 生成。
 * 検出箇所をカテゴリ別トークン（[EMAIL] / [API_KEY] など）へ置換する。
 * 位置ズレを防ぐため、end の降順（文章の後ろから）で置換を適用する。
 *
 * 前提: detections は scanner 側で重複範囲がマージ済みであること。
 */
export function maskText(text: string, detections: Detection[]): string {
  const sorted = [...detections].sort((a, b) => b.start - a.start);
  let result = text;
  for (const d of sorted) {
    result = result.slice(0, d.start) + d.masked + result.slice(d.end);
  }
  return result;
}
