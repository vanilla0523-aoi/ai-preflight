# AI Preflight

**AIに送る前に、安全確認。**

ChatGPT / Claude / Gemini などの生成AIへ文章を送信する前に、個人情報・認証情報・社内NG情報が含まれていないかをチェックし、機密箇所をマスクした **Safe Prompt** を生成するPoC（概念実証）Webアプリケーションです。

## 背景

生成AIの業務利用では、「AIを使わせない」という対応ではなく、**安全に使える仕組みを整えること**が重要だと考えています。

また、AIへ入力してはいけない情報は、メールアドレスやAPIキーのような一般的な機密情報だけではありません。未公開プロジェクト名や顧客名など、**企業ごとに異なる機密情報**が存在します。

そのため本PoCでは、

- 共通検知ルール（Rule-based Detection）
- 企業独自の Organization Policy（社内NGルール）

という2層構成を採用しました。人間が毎回ガイドラインを思い出して判断するのではなく、送信前に機械的に確認できる体験を検証します。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

その他のコマンド:

```bash
npm run lint    # ESLint
npm run build   # 本番ビルド（lint / build とも通ることを確認済み）
npx tsx scripts/scanner-check.ts   # Scanner単体の動作確認（デモ3シナリオ）
```

## 使い方

1. 生成AIへ送る予定の文章をテキストエリアへ貼り付ける（「サンプルを入力」でデモ用文章を自動入力できます）
2. 「送信前チェック」を押す
3. Risk Level（SAFE / LOW / HIGH / CRITICAL）・検出結果一覧・該当箇所ハイライトを確認する
4. 「安全化した文章をコピー」で Safe Prompt をコピーし、任意の生成AIへ入力する

### デモシナリオ

| 入力 | 結果 |
| --- | --- |
| `ReactのuseEffectについて説明してください。` | SAFE |
| `API_KEY=sk-xxxx を使ってこのコードを修正して` | CRITICAL（API Key検知 → `API_KEY=[API_KEY]`） |
| `Project Ravenの仕様について相談したい` | HIGH（社内ルール：未公開プロジェクト名） |

## アーキテクチャ

```
src/
  app/
    page.tsx                 # 1画面PoC UI（クライアントコンポーネント）
  lib/security/
    types.ts                 # Detection / ScanResult / OrganizationRule 型
    detect.ts                # detector実装用ヘルパー（マッチ列挙・部分マスク）
    scanner.ts               # 全detector実行 → 重複マージ → Risk算出
    masker.ts                # Safe Prompt生成（後方から置換して位置ズレ防止）
    organizationRules.ts     # 社内NGルール設定ファイル（ここを編集して運用）
    detectors/
      apiKey.ts              # API Key / Token / Password / Secret（CRITICAL）
      awsKey.ts              # AWS Access Key（CRITICAL）
      email.ts               # メールアドレス（HIGH）
      phone.ts               # 日本の電話番号（HIGH）
      ipAddress.ts           # IPv4アドレス（MEDIUM）
      organizationPolicy.ts  # 社内NGワード（organizationRules.tsを参照）
      personName.ts          # 敬称付き氏名らしき情報（MEDIUM・誤検知前提）
```

### detectorの追加方法

`Detector = (text: string) => Detection[]` の純関数を `detectors/` に1ファイル作り、`scanner.ts` の `detectors` 配列へ登録するだけです。

### 社内NGルールの追加方法

`src/lib/security/organizationRules.ts` の配列へオブジェクトを追加します。管理画面・認証はPoCでは実装せず、設定ファイル管理としています。

```ts
{
  id: "product-code",
  label: "商品コード",
  keywords: ["PRD-2026"],
  severity: "high",
  message: "商品コードは外部AIへ送信できません。",
  maskToken: "[PRODUCT_CODE]",
}
```

## 設計意図

- **Prompt → Scan → Warning → Safe Prompt の体験を最優先。** 商用セキュリティ製品ではなく、「AI利用前のセキュリティチェック」という体験が成立するかを確認するPoCです。
- **警告するだけで終わらない。** NGを出すだけでは「AIを禁止するツール」になってしまうため、必ずSafe Promptを提示し、安全にAIを使い続けられるUXにしています。恐怖を煽るデザイン（黒背景＋ハッカー風）は避け、業務ツールとして自然なUIにしました。
- **重複検知のマージ。** `API_KEY=sk-xxx` は「KEY=VALUE形式の認証情報」と「sk-形式のAPIキー」の両方にマッチするため、severity優先 → 範囲長優先で1件にマージしています。
- **誤検知・検知漏れは許容。** 氏名検出は敬称ベースの簡易パターン（＋「仕様」「彼氏」等の除外リスト）で、完全検知は目指していません。画面上のDisclaimerでもその旨を明示しています。

## セキュリティ上の判断

このツール自体が情報漏洩の原因にならないことを最重要の設計方針としています。

- **入力文章を外部へ一切送信しない** — 検知処理はすべてブラウザ内（クライアントサイド）で完結します。APIルートすら存在しません。
- **入力本文をDBへ保存しない** — 履歴機能なし。ステートはReactのメモリ上のみです。
- **入力本文をログへ出力しない** — `console.log` 等でRaw Promptを出力するコードはありません。
- **Analyticsへ送信しない** — 外部Analyticsは未導入。Next.jsの匿名ビルドテレメトリも `next telemetry disable` で無効化済みです（入力内容とは無関係ですが念のため）。
- **APIキーをブラウザへ露出しない** — 外部LLMを利用しないため、そもそもクライアントに秘密情報が存在しません。
- **検出結果カードにも生の機密情報を出さない** — 表示用には部分マスク（`sk-t************` / `tan***@example.com`）を使用します。

### なぜLLMに「機密情報はありますか？」と聞かないのか

機密情報を検知するサービス自身が、機密情報を外部AIへ送信してしまうためです。将来LLMによる意味的チェックを導入する場合も、**Rule-based detection → masking → optional LLM analysis** の順とし、マスク後の文章のみをLLMへ渡す構成（Rule + LLM ハイブリッド）を想定しています。

```
Raw Prompt
  ↓ Local / Rule Detection
  ↓ Sensitive Data Masking
Masked Prompt
  ↓ LLM Semantic Analysis（将来・任意）
Final Risk Assessment
```

## 今回実装しなかったもの

PoCのスコープ外として、以下は意図的に実装していません。

ユーザー登録・ログイン・DB・診断履歴・本格的な管理画面・社員管理・SSO・Active Directory連携・Slack連携・ChatGPT/Claude連携・ブラウザ拡張・Proxy機能・DLP製品連携・Audit Log・LLMによる意味的チェック（Priority 3）・クレジットカード番号のLuhn判定・NGルール設定UI

## Future Improvements

- **管理画面** — 管理者が社内NGルール（NGワード・カテゴリ・リスクレベル）をUIから設定
- **組織単位ポリシー** — 会社・部署別ポリシー（営業部：顧客名・契約金額禁止 / 開発部：APIキー・コードネーム禁止 / 人事部：候補者名・評価情報禁止 など）
- **ブラウザ拡張** — ChatGPT等へ入力する瞬間に自動チェック
- **AI Gateway** — 企業からLLMへ送信されるリクエストをProxyし自動検査
- **LLMによる意味的チェック** — マスク後の文章に対する、正規表現では判断できない機密情報（未公開の経営情報・文脈上センシティブな内容）の検出
- **Audit Log** — いつ・どのカテゴリの情報が検出されたかを記録（入力本文自体は保存しない設計を検討）
- **SaaS連携** — Slack / Google Workspace / Microsoft 365 / GitHub 等

## Disclaimer

本ツールは機密情報の漏洩を完全に防止するものではありません。所属組織のセキュリティポリシーに従って生成AIをご利用ください。

## 技術スタック

Next.js 16 (App Router) / TypeScript / Tailwind CSS 4
