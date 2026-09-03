import { describe, expect, it } from "vitest";
import { scanText } from "./scanner";
import { luhnCheck } from "./detectors/creditCard";

describe("scanner: デモシナリオ", () => {
  it("安全な文章は SAFE になる", () => {
    const r = scanText("ReactのuseEffectについて説明してください。");
    expect(r.riskLevel).toBe("safe");
    expect(r.detections).toHaveLength(0);
    expect(r.safePrompt).toBe("ReactのuseEffectについて説明してください。");
  });

  it("APIキーは CRITICAL になり、キー名を残して値だけマスクされる", () => {
    const r = scanText("API_KEY=sk-test-abcdef123456 を使ってこのコードを修正して");
    expect(r.riskLevel).toBe("critical");
    expect(r.safePrompt).toBe("API_KEY=[API_KEY] を使ってこのコードを修正して");
  });

  it("社内NGワード（未公開プロジェクト名）は HIGH になる", () => {
    const r = scanText("Project Ravenの仕様について相談したい");
    expect(r.riskLevel).toBe("high");
    expect(r.detections).toHaveLength(1);
    expect(r.detections[0].type).toBe("org-policy");
    expect(r.safePrompt).toBe("[PROJECT_NAME]の仕様について相談したい");
  });
});

describe("scanner: 個別detector", () => {
  it("メールアドレスを検出し、表示用は部分マスクされる", () => {
    const r = scanText("連絡先は tanaka@example.com です");
    const email = r.detections.find((d) => d.type === "email");
    expect(email).toBeDefined();
    expect(email!.display).toBe("tan***@example.com");
    expect(r.safePrompt).toContain("[EMAIL]");
  });

  it("日本の電話番号（ハイフン区切り）を検出する", () => {
    const r = scanText("電話は 090-1234-5678 まで");
    expect(r.detections.some((d) => d.type === "phone")).toBe(true);
    expect(r.safePrompt).toContain("[PHONE]");
  });

  it("AWS Access Key を検出する", () => {
    const r = scanText("鍵は AKIAIOSFODNN7EXAMPLE です");
    expect(r.detections.some((d) => d.type === "aws-key")).toBe(true);
    expect(r.riskLevel).toBe("critical");
  });

  it("IPv4アドレスを検出し、不正な値（999.…）は検出しない", () => {
    expect(scanText("server: 192.168.10.21").detections.some((d) => d.type === "ip-address")).toBe(true);
    expect(scanText("value: 999.999.999.999").detections.some((d) => d.type === "ip-address")).toBe(false);
  });

  it("Luhn検証を通るカード番号のみ検出する", () => {
    expect(luhnCheck("4111111111111111")).toBe(true);
    expect(luhnCheck("4111111111111112")).toBe(false);
    const hit = scanText("カードは 4111 1111 1111 1111 です");
    expect(hit.detections.some((d) => d.type === "credit-card")).toBe(true);
    expect(hit.safePrompt).toContain("[CREDIT_CARD]");
    // Luhn不成立の数字列（注文番号など）は検出しない
    const miss = scanText("注文番号は 4111 1111 1111 1112 です");
    expect(miss.detections.some((d) => d.type === "credit-card")).toBe(false);
  });

  it("社内NGワードは大文字小文字を無視して一致する", () => {
    const r = scanText("PROJECT RAVEN について");
    expect(r.detections.some((d) => d.type === "org-policy")).toBe(true);
  });
});

describe("scanner: 誤検知の抑制", () => {
  it("「仕様」「彼氏」を敬称付き人名として誤検知しない", () => {
    const r = scanText("仕様について彼氏と話した");
    expect(r.detections.some((d) => d.type === "person")).toBe(false);
  });

  it("敬称付きの人名は検出する", () => {
    const r = scanText("田中さんに確認します");
    expect(r.detections.some((d) => d.type === "person")).toBe(true);
  });
});

describe("scanner: 重複マージとマスク位置", () => {
  it("KEY=VALUE形式とsk-形式が重なる場合は1件にマージされる", () => {
    const r = scanText("API_KEY=sk-test-abcdef123456");
    expect(r.detections).toHaveLength(1);
    expect(r.detections[0].severity).toBe("critical");
  });

  it("複数検出時もマスク位置がずれない", () => {
    const r = scanText("AとBへ連絡: a@example.com / b@example.com です");
    expect(r.safePrompt).toBe("AとBへ連絡: [EMAIL] / [EMAIL] です");
  });

  it("riskScore が severity に応じて加算される", () => {
    // critical(100) + high(email 50)
    const r = scanText("token=abcd1234 と mail@example.com");
    expect(r.riskScore).toBe(150);
  });
});
