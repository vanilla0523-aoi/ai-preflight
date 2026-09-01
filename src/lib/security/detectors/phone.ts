import type { Detector } from "../types";
import { findAll, makeDetection, partialMask } from "../detect";

/**
 * 日本の電話番号形式（ハイフンあり）。
 * 例: 03-1234-5678 / 090-1234-5678 / 0120-123-456
 * 誤検知を減らすため、PoC ではハイフン区切りの形式のみを対象とする。
 */
const PHONE_RE = /(?<![\d-])0\d{1,4}-\d{1,4}-\d{3,4}(?![\d-])/g;

export const detectPhone: Detector = (text) =>
  findAll(text, PHONE_RE).map((m) =>
    makeDetection({
      type: "phone",
      label: "電話番号",
      severity: "high",
      start: m.start,
      end: m.end,
      original: m.text,
      masked: "[PHONE]",
      display: partialMask(m.text, 4),
      reason:
        "日本の電話番号形式と思われる文字列が含まれています。個人や取引先の連絡先情報の可能性があります。",
    })
  );
