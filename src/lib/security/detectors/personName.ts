import type { Detector } from "../types";
import { findAll, makeDetection } from "../detect";

/**
 * 「氏名らしき情報」の簡易検出。
 * 完全な固有名詞抽出は行わず、敬称（さん・様・氏・さま・殿）付きの日本語人名パターンのみを対象とする。
 * 誤検知がありうる前提の MEDIUM 扱い（PoC 方針: 完全検知を目指さない）。
 */
const PERSON_RE = /[一-龯々]{1,4}(?:さん|さま|様|氏|殿)/g;

/**
 * 敬称と同じ文字で終わる一般名詞の除外リスト。
 * 「仕様」「模様」「彼氏」等を人名として誤検知しないためのもの。
 */
const NOT_PERSON = new Set([
  "仕様",
  "模様",
  "同様",
  "一様",
  "多様",
  "異様",
  "態様",
  "文様",
  "紋様",
  "様様",
  "客様",
  "皆様",
  "神様",
  "王様",
  "彼氏",
  "摂氏",
  "華氏",
  "両氏",
  "各氏",
  "御殿",
  "宮殿",
  "殿殿",
]);

function endsWithBlocked(match: string): boolean {
  for (const word of NOT_PERSON) {
    if (match.endsWith(word)) return true;
  }
  return false;
}

export const detectPersonName: Detector = (text) =>
  findAll(text, PERSON_RE)
    .filter((m) => !endsWithBlocked(m.text))
    .map((m) =>
    makeDetection({
      type: "person",
      label: "氏名らしき情報",
      severity: "medium",
      start: m.start,
      end: m.end,
      original: m.text,
      masked: "[PERSON]",
      display: m.text.slice(0, 1) + "*".repeat(Math.max(1, m.text.length - 1)),
      reason:
        "敬称付きの人名と思われる表現が含まれています。個人名は匿名化して送信することを推奨します。",
    })
  );
