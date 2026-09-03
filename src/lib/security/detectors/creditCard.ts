import type { Detector } from "../types";
import { findAll, makeDetection, partialMask } from "../detect";

/**
 * クレジットカード番号らしき値の検出。
 * 13〜19桁の数字列（スペース・ハイフン区切り可）を候補とし、Luhnアルゴリズムで検証する。
 * Luhn検証を通らない数字列（注文番号など）は検出しない。
 */
const CANDIDATE_RE = /(?<![\d-])(?:\d[ -]?){12,18}\d(?![\d-])/g;

export function luhnCheck(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export const detectCreditCard: Detector = (text) =>
  findAll(text, CANDIDATE_RE)
    .filter((m) => {
      const digits = m.text.replace(/[ -]/g, "");
      return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits);
    })
    .map((m) =>
      makeDetection({
        type: "credit-card",
        label: "クレジットカード番号らしき値",
        severity: "high",
        start: m.start,
        end: m.end,
        original: m.text,
        masked: "[CREDIT_CARD]",
        display: partialMask(m.text, 4),
        reason:
          "クレジットカード番号の形式（Luhn検証済み）と一致する数字列が含まれています。決済情報は外部AIへ送信しないでください。",
      })
    );
