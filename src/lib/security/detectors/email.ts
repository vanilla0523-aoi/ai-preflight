import type { Detector } from "../types";
import { findAll, makeDetection, maskEmailForDisplay } from "../detect";

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

export const detectEmail: Detector = (text) =>
  findAll(text, EMAIL_RE).map((m) =>
    makeDetection({
      type: "email",
      label: "メールアドレス",
      severity: "high",
      start: m.start,
      end: m.end,
      original: m.text,
      masked: "[EMAIL]",
      display: maskEmailForDisplay(m.text),
      reason:
        "メールアドレスと思われる文字列が含まれています。個人を特定できる情報を外部AIへ送信すると、意図しない情報漏洩につながる可能性があります。",
    })
  );
