/**
 * Scanner の動作確認スクリプト（デモ3シナリオ＋サンプル文章）。
 * 実行: npx tsx scripts/scanner-check.ts
 * ※ ダミーデータのみを使用しており、実際の機密情報は含まれない。
 */
import { scanText } from "../src/lib/security/scanner";
import { sampleText } from "../src/lib/security/sample";

const cases: [string, string][] = [
  ["Demo1 安全な文章", "ReactのuseEffectについて説明してください。"],
  ["Demo2 APIキー", "API_KEY=sk-test-abcdef123456 を使ってこのコードを修正して"],
  ["Demo3 社内ルール", "Project Ravenの仕様について相談したい"],
  ["サンプル文章", sampleText],
  ["電話・IP・AWS", "連絡先は 03-1234-5678、サーバーは 192.168.10.21、鍵は AKIAIOSFODNN7EXAMPLE"],
];

for (const [name, text] of cases) {
  const r = scanText(text);
  console.log(`\n=== ${name} ===`);
  console.log(`riskLevel: ${r.riskLevel} / score: ${r.riskScore} / detections: ${r.detections.length}`);
  for (const d of r.detections) {
    console.log(`  - [${d.severity}] ${d.label} (${d.start}-${d.end}) display=${d.display} -> ${d.masked}`);
  }
  console.log(`safePrompt: ${r.safePrompt}`);
}
