import type { Detection, Detector, RiskLevel, ScanResult, Severity } from "./types";
import { detectApiKey } from "./detectors/apiKey";
import { detectAwsKey } from "./detectors/awsKey";
import { detectCreditCard } from "./detectors/creditCard";
import { detectEmail } from "./detectors/email";
import { detectIpAddress } from "./detectors/ipAddress";
import { detectOrganizationPolicy } from "./detectors/organizationPolicy";
import { detectPersonName } from "./detectors/personName";
import { detectPhone } from "./detectors/phone";
import { maskText } from "./masker";

/**
 * Security Scanner 本体。
 * すべての処理はこのモジュール内（＝ブラウザ内）で完結し、入力文章を外部へ送信しない。
 *
 * detector を追加する場合は、detectors/ にファイルを作り、この配列へ登録するだけでよい。
 * 実行順はマージ時の優先順位に影響しない（severity と範囲長で決まる）。
 */
const detectors: Detector[] = [
  detectApiKey,
  detectAwsKey,
  detectCreditCard,
  detectEmail,
  detectPhone,
  detectIpAddress,
  detectOrganizationPolicy,
  detectPersonName,
];

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const SEVERITY_SCORE: Record<Severity, number> = {
  critical: 100,
  high: 50,
  medium: 20,
  low: 5,
};

/**
 * 重複・包含関係にある検出範囲をマージする。
 * 例: 「API_KEY=sk-xxx」全体（認証情報）と「sk-xxx」（API Key）が両方マッチした場合、
 * severity が高い方 → 同率なら範囲が広い方を残す。
 */
function dedupeOverlaps(detections: Detection[]): Detection[] {
  const sorted = [...detections].sort((a, b) => {
    const sev = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (sev !== 0) return sev;
    return b.end - b.start - (a.end - a.start);
  });

  const kept: Detection[] = [];
  for (const d of sorted) {
    const overlaps = kept.some((k) => d.start < k.end && k.start < d.end);
    if (!overlaps) kept.push(d);
  }
  return kept.sort((a, b) => a.start - b.start);
}

function calcRiskLevel(detections: Detection[]): RiskLevel {
  if (detections.length === 0) return "safe";
  const top = detections.reduce<Severity>(
    (acc, d) => (SEVERITY_ORDER[d.severity] > SEVERITY_ORDER[acc] ? d.severity : acc),
    "low"
  );
  // 4段階表示（SAFE / LOW / HIGH / CRITICAL）に丸める: medium は low 寄りの注意として扱う
  if (top === "medium") return "low";
  return top;
}

export function scanText(text: string): ScanResult {
  const raw = detectors.flatMap((detect) => detect(text));
  const detections = dedupeOverlaps(raw);
  const riskScore = detections.reduce((sum, d) => sum + SEVERITY_SCORE[d.severity], 0);

  return {
    riskLevel: calcRiskLevel(detections),
    riskScore,
    detections,
    safePrompt: maskText(text, detections),
  };
}
