import type { Detection, Severity } from "./types";

/**
 * detector 実装用の小さなヘルパー群。
 * 各 detector は「正規表現でマッチ位置を集めて Detection[] を返す」だけの純関数として実装する。
 */

let seq = 0;

export function makeDetection(params: {
  type: string;
  label: string;
  severity: Severity;
  start: number;
  end: number;
  original: string;
  masked: string;
  reason: string;
  display?: string;
}): Detection {
  seq += 1;
  return {
    id: `${params.type}-${seq}`,
    display: params.display ?? partialMask(params.original),
    ...params,
  };
}

/**
 * 画面表示用の部分マスク。
 * 先頭数文字だけ残して残りを * にする（検出結果カードに生の機密情報を出さないため）。
 */
export function partialMask(value: string, visible = 4): string {
  if (value.length <= visible) {
    return "*".repeat(value.length);
  }
  const maskedLen = Math.min(value.length - visible, 12);
  return value.slice(0, visible) + "*".repeat(maskedLen);
}

/** メールアドレス用: ローカル部の先頭3文字だけ残す（例: tan***@example.com） */
export function maskEmailForDisplay(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return partialMask(email);
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = Math.min(3, Math.max(1, local.length - 1));
  return local.slice(0, visible) + "***" + domain;
}

/** 正規表現の全マッチを { start, end, text } で列挙する */
export function findAll(
  text: string,
  regex: RegExp
): { start: number; end: number; text: string }[] {
  const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  const re = new RegExp(regex.source, flags);
  const results: { start: number; end: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex += 1;
      continue;
    }
    results.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return results;
}
