/**
 * Detection Engine の共通型定義。
 *
 * detector / scanner / masker / organizationRules はすべてこの型を介して疎結合になっており、
 * detector を追加する際は `Detector` 型の関数を 1 ファイル作って scanner に登録するだけでよい。
 */

export type Severity = "low" | "medium" | "high" | "critical";

export type RiskLevel = Severity | "safe";

export type Detection = {
  /** 検出ごとの一意ID（type + 連番） */
  id: string;
  /** 検出カテゴリの機械可読な種別（例: "email", "api-key", "org-policy"） */
  type: string;
  /** 画面表示用ラベル（例: "メールアドレス"） */
  label: string;
  severity: Severity;
  /** 入力文章内の開始オフセット（inclusive） */
  start: number;
  /** 入力文章内の終了オフセット（exclusive） */
  end: number;
  /** 検出した元の文字列（画面へそのまま出さないこと。表示には display を使う） */
  original: string;
  /** Safe Prompt で置換するトークン（例: "[EMAIL]"） */
  masked: string;
  /** 画面表示用に部分マスクした文字列（例: "sk-test-*******"） */
  display: string;
  /** 検出理由・リスク説明 */
  reason: string;
};

/** detector の共通インターフェース。text を受け取り Detection[] を返す純関数。 */
export type Detector = (text: string) => Detection[];

export type ScanResult = {
  riskLevel: RiskLevel;
  /** 内部的なリスクスコア（critical +100 / high +50 / medium +20 / low +5） */
  riskScore: number;
  detections: Detection[];
  safePrompt: string;
};

/** 企業ごとの AI 入力 NG ルール（設定ファイル organizationRules.ts で定義） */
export type OrganizationRule = {
  id: string;
  label: string;
  keywords: string[];
  severity: Severity;
  message: string;
  /** Safe Prompt での置換トークン。省略時は "[ORG_POLICY]" */
  maskToken?: string;
};
