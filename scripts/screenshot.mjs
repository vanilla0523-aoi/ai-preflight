import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
});
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.screenshot({ path: "/tmp/preflight-initial.png", fullPage: true });

await page.getByRole("button", { name: "サンプルを入力" }).click();
await page.getByRole("button", { name: "送信前チェック" }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/preflight-result.png", fullPage: true });

await browser.close();
console.log("done");
