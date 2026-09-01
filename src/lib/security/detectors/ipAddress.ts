import type { Detector } from "../types";
import { findAll, makeDetection } from "../detect";

const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

function isValidIpv4(value: string): boolean {
  return value.split(".").every((part) => {
    const n = Number(part);
    return n >= 0 && n <= 255 && String(n) === part;
  });
}

export const detectIpAddress: Detector = (text) =>
  findAll(text, IPV4_RE)
    .filter((m) => isValidIpv4(m.text))
    .map((m) =>
      makeDetection({
        type: "ip-address",
        label: "IPアドレス",
        severity: "medium",
        start: m.start,
        end: m.end,
        original: m.text,
        masked: "[IP_ADDRESS]",
        reason:
          "IPv4アドレスと思われる文字列が含まれています。社内ネットワークやサーバー構成の情報が推測される可能性があります。",
      })
    );
