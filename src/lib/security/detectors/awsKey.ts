import type { Detector } from "../types";
import { findAll, makeDetection } from "../detect";

// AWS Access Key ID（AKIA / ASIA から始まる20文字）
const AWS_KEY_RE = /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g;

export const detectAwsKey: Detector = (text) =>
  findAll(text, AWS_KEY_RE).map((m) =>
    makeDetection({
      type: "aws-key",
      label: "AWS Access Key",
      severity: "critical",
      start: m.start,
      end: m.end,
      original: m.text,
      masked: "[AWS_ACCESS_KEY]",
      reason:
        "AWS Access Keyと思われる文字列が含まれています。クラウド環境への不正アクセスや高額請求につながる可能性があります。",
    })
  );
