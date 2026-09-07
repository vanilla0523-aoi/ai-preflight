import type { Detection, Detector } from "../types";
import { makeDetection } from "../detect";
import { organizationRules } from "../organizationRules";

/**
 * 社内 NG ワード検出（Organization Policy Violation）。
 * organizationRules.ts の keywords と入力文章を比較し、
 * 一致した箇所を一般検知と同じ Detection として返す。
 */

export const detectOrganizationPolicy: Detector = (text) => {
  const detections: Detection[] = [];
  const lower = text.toLowerCase();

  for (const rule of organizationRules) {
    for (const keyword of rule.keywords) {
      // 空文字キーワードは indexOf が常に 0 を返し、探索位置が進まず無限ループになる。
      // 設定ファイルは人が編集する前提なので、ここで防御的に弾く。
      if (!keyword.trim()) continue;

      const needle = keyword.toLowerCase();
      let from = 0;
      let idx: number;
      while ((idx = lower.indexOf(needle, from)) !== -1) {
        const original = text.slice(idx, idx + keyword.length);
        detections.push(
          makeDetection({
            type: "org-policy",
            label: `社内ルール：${rule.label}`,
            severity: rule.severity,
            start: idx,
            end: idx + keyword.length,
            original,
            masked: rule.maskToken ?? "[ORG_POLICY]",
            // 社内ルールは何が NG かをユーザーが認識する必要があるため、キーワードはそのまま表示する
            display: original,
            reason: `「${keyword}」は社内ルール（${rule.label}）として登録されています。${rule.message}`,
          })
        );
        // 最低1文字は進めて、探索が止まらないことを保証する
        from = idx + Math.max(1, keyword.length);
      }
    }
  }
  return detections;
};
