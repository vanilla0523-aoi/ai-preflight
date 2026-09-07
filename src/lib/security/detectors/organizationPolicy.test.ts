import { describe, expect, it, vi } from "vitest";

/**
 * 社内NGルールは企業側が設定ファイルを編集して運用する前提のため、
 * 不正な設定値でもアプリが壊れないことを確認する。
 */
vi.mock("../organizationRules", () => ({
  organizationRules: [
    {
      id: "empty-keyword",
      label: "設定ミス",
      // 空文字は indexOf が常に 0 を返すため、素朴な実装だと無限ループする
      keywords: ["", "   "],
      severity: "high",
      message: "空のキーワードが登録されています。",
    },
    {
      id: "valid",
      label: "顧客名",
      keywords: ["株式会社サンプル"],
      severity: "high",
      message: "顧客名は匿名化してください。",
      maskToken: "[CUSTOMER]",
    },
  ],
}));

const { detectOrganizationPolicy } = await import("./organizationPolicy");

describe("organizationPolicy: 不正な設定値への耐性", () => {
  it("空文字キーワードがあっても無限ループせず、検出もしない", () => {
    const detections = detectOrganizationPolicy("何らかの文章です");
    expect(detections).toHaveLength(0);
  });

  it("空文字キーワードと有効なキーワードが混在しても、有効な方だけ検出する", () => {
    const detections = detectOrganizationPolicy("株式会社サンプルの件");
    expect(detections).toHaveLength(1);
    expect(detections[0].masked).toBe("[CUSTOMER]");
  });

  it("同一キーワードが複数回出現しても、出現回数どおりに検出する", () => {
    const detections = detectOrganizationPolicy(
      "株式会社サンプルと株式会社サンプルの比較"
    );
    expect(detections).toHaveLength(2);
    expect(detections[0].start).toBeLessThan(detections[1].start);
  });
});
