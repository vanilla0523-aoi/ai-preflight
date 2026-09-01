import type { Detection, Detector } from "../types";
import { findAll, makeDetection } from "../detect";

/**
 * 認証情報（API Key / Token / Password / Secret 等）の検出。
 * CRITICAL 扱い。パターンは追加しやすいよう配列で管理する。
 */

type Pattern = {
  regex: RegExp;
  label: string;
  masked: string;
  reason: string;
};

const REASON_API_KEY =
  "APIキーと思われる情報が含まれています。認証情報が外部へ漏洩すると、第三者によるAPI利用や不正アクセスにつながる可能性があります。";

const PATTERNS: Pattern[] = [
  {
    // OpenAI 等の sk- 形式キー
    regex: /sk-[A-Za-z0-9_-]{8,}/g,
    label: "API Key",
    masked: "[API_KEY]",
    reason: REASON_API_KEY,
  },
  {
    // GitHub Token (ghp_, gho_, ghu_, ghs_, ghr_)
    regex: /gh[pousr]_[A-Za-z0-9]{16,}/g,
    label: "GitHub Token",
    masked: "[API_KEY]",
    reason:
      "GitHubトークンと思われる情報が含まれています。リポジトリへの不正アクセスにつながる可能性があります。",
  },
  {
    // Bearer トークン
    regex: /(?<=Bearer\s{1,4})[A-Za-z0-9._~+/-]{8,}=*/g,
    label: "Bearer Token",
    masked: "[TOKEN]",
    reason:
      "Bearerトークンと思われる情報が含まれています。認証済みセッションの乗っ取りにつながる可能性があります。",
  },
  {
    // KEY=VALUE / KEY: VALUE 形式。キー名は残し、値の部分だけを検出・マスクする
    // （例: API_KEY=sk-xxx → API_KEY=[API_KEY] になるよう、lookbehind で値のみマッチ）
    regex:
      /(?<=\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|token|secret|password|passwd|pwd)\s*[=:]\s*)["']?[^\s"']{4,}["']?/gi,
    label: "認証情報",
    masked: "[CREDENTIAL]",
    reason:
      "パスワード・トークン等の認証情報と思われる記述が含まれています。外部AIへ送信しないでください。",
  },
];

export const detectApiKey: Detector = (text) => {
  const detections: Detection[] = [];
  for (const p of PATTERNS) {
    for (const m of findAll(text, p.regex)) {
      detections.push(
        makeDetection({
          type: "api-key",
          label: p.label,
          severity: "critical",
          start: m.start,
          end: m.end,
          original: m.text,
          masked: p.masked,
          reason: p.reason,
        })
      );
    }
  }
  return detections;
};
