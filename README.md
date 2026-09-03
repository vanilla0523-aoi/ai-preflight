# AI Preflight

> **AIに送る前に、安全確認。** — ChatGPT / Claude / Gemini などの生成AIへ文章を送信する前に、個人情報・認証情報・社内NG情報をチェックし、機密箇所をマスクした **Safe Prompt** を生成するPoC Webアプリケーション。

## 1. アイデア

- **ひとことで:** 生成AIへの「送信前チェック」を行うセキュリティツール
- **想定ユーザー:** 企業内で生成AIを業務利用する社員（エンジニア・営業・CS・PM・バックオフィスなど）
- **解決したい課題:** 生成AIの業務利用時に、個人情報・APIキー・社外秘情報を意図せず入力してしまうリスク。「AIに何を入力してよいか」のルールは企業ごとに異なり、現状は社員個人の判断と注意喚起に依存している
- **提供する価値:** AI利用ルールを個人の判断ではなく、組織共通のルールとして機械的に適用できること。ユーザーが「これは入力していい情報か？」を毎回判断する負担を減らす
- **主な利用場面:** ChatGPTやClaudeへプロンプトを貼り付ける直前の事前チェック
- **なぜAIとセキュリティか:** 「AIを使わせない」のではなく、**安全に使える仕組みを整える**ことが重要だと考えたため。警告だけで終わらせず、マスク済みのSafe Promptを提示することで、セキュリティと利便性を両立させる
- **展開可能性:** 一般的な検知に加えて企業独自の「AI入力NGルール」を設定できる構成のため、部署別ポリシー・ブラウザ拡張・AI Gatewayへ発展させられる（→ [Future Improvements](#future-improvements)）

<!-- TODO(あおい): 「アイデアのきっかけとなった体験や観察」を1〜2行で追記 -->

## 2. プロトタイプとデモ

### デモ

- **デモURL:** なし（ローカル起動。下記[セットアップ](#5-セットアップ)参照）
- **デモシナリオ:**

| # | 入力 | 期待結果 |
| --- | --- | --- |
| 1 | `ReactのuseEffectについて説明してください。` | **SAFE**（検出なし） |
| 2 | `API_KEY=sk-xxxx を使ってこのコードを修正して` | **CRITICAL**（API Key検知。Safe Prompt: `API_KEY=[API_KEY] を使って…`） |
| 3 | `Project Ravenの仕様について相談したい` | **HIGH**（社内ルール違反：未公開プロジェクト名） |

画面の「サンプルを入力」ボタンで、個人名・メールアドレス・APIキー・社内NGワードを一度にデモできる文章を自動入力できます。

### 代表的な利用の流れ

1. **入力:** 生成AIへ送る予定の文章をテキストエリアへ貼り付け、「送信前チェック」を押す
2. **処理:** ブラウザ内で Rule-based Detection（正規表現＋社内NGワードリスト）を実行し、重複範囲をマージしてリスクを算出
3. **出力:** Risk Level（SAFE / LOW / HIGH / CRITICAL）、検出結果カード（検出理由つき）、元文章の該当箇所ハイライト、マスク済みSafe Prompt（コピーボタンつき）

### 実装範囲

- **実装済み:** テキスト入力／送信前チェック／Email・API Key・AWS Key・電話番号・IPv4・クレジットカード番号（Luhn検証）・氏名らしき情報の検出／社内NGワード検出（設定ファイル）／Risk Level・Risk Score／検出理由表示／該当箇所ハイライト／Safe Prompt生成・コピー／サンプル入力／Scannerのユニットテスト（vitest・14ケース）
- **モックまたは簡易実装:** 氏名検出は敬称ベースの簡易パターン（誤検知・漏れを許容する前提）。社内NGルールは管理画面ではなく設定ファイル（`organizationRules.ts`）で管理
- **未実装（意図的にスコープ外）:** ログイン・DB・診断履歴・管理画面・SSO・ブラウザ拡張・Proxy・DLP連携・Audit Log・LLMによる意味的チェック
- **評価者が確認できる操作手順:** `npm run dev` → http://localhost:3000 → 「サンプルを入力」→「送信前チェック」→ CRITICAL判定と検出5件、Safe Promptが表示されること。CLIでは `npx tsx scripts/scanner-check.ts` でデモ3シナリオの判定を確認できます

## 3. 技術構成

- **全体構成:** Next.js 16 (App Router) / TypeScript / Tailwind CSS 4 の1画面クライアントアプリ。検知処理はすべてブラウザ内で完結し、**APIルートも外部通信も存在しない**
- **処理の流れ:** `scanner.ts` が detector 群（純関数 `(text) => Detection[]`）を実行 → 重複範囲を severity優先→範囲長優先でマージ → Risk算出 → `masker.ts` が後方から置換してSafe Promptを生成（位置ズレ防止）
- **使用したAI・モデル:** アプリ実行時にはAI・LLMを使用しない（意図的な設計判断。理由は下記）

```
src/lib/security/
  types.ts                 # Detection / ScanResult / OrganizationRule 型
  detect.ts                # detector実装ヘルパー（マッチ列挙・表示用部分マスク）
  scanner.ts               # 全detector実行 → 重複マージ → Risk算出
  masker.ts                # Safe Prompt生成
  organizationRules.ts     # 社内NGルール設定ファイル（ここを編集して運用）
  scanner.test.ts          # ユニットテスト（デモシナリオ・マージ・誤検知抑制など14ケース）
  detectors/               # apiKey / awsKey / email / phone / ipAddress / creditCard /
                           # organizationPolicy / personName（1ファイル追加で拡張可能）
```

### 安全性で考慮したこと（このツール自体が漏洩源にならないこと）

- **Raw Promptを外部へ一切送信しない** — 「機密情報がありますか？」とLLMに直接聞く方式は、検知サービス自身が機密情報を外部AIへ送信してしまうため採用しない。将来LLMで意味的チェックを行う場合も **Rule-based detection → masking → LLM analysis** の順とし、マスク後の文章のみを渡す
- 入力本文をDB・ログ・Analyticsへ出さない（履歴機能なし、`console.log`なし、外部Analytics未導入、Nextの匿名テレメトリも無効化）
- 検出結果カードにも生の機密情報を出さない（`sk-t************` / `tan***@example.com` のような部分マスク表示）
- APIキー等の秘密情報をクライアントへ持たない（外部LLM不使用のため、そもそも存在しない）

## 4. 判断・制約・学び

- **優先したこと:** Prompt → Scan → Warning → Safe Prompt という中心体験を1画面で完成させること。DB・認証・管理画面は作らない
- **作らなかったことと理由:** LLMによる意味的チェック（Raw Promptを外部へ送らない制約を最優先し、PoCではルールベースで主要体験が成立すると判断）／NGルール管理画面（設定ファイルで代替）
- **うまくいかなかったこと・対処:** 氏名検出で「Project Ravenの**仕様**について」の「仕様」を「仕＋様（敬称）」と誤検知 → 「仕様」「模様」「彼氏」等の除外リストを追加して解消。同種の誤検知は本質的に残るため、完全検知を目指さない前提を画面のDisclaimerにも明示
- **既知の制約:** 検知は正規表現＋キーワード一致の範囲。文脈依存の機密情報（未公開の経営情報など）は検出できない／電話番号はハイフン区切り形式のみ対象（誤検知抑制のため）

## 5. セットアップ

### 必要な環境

- Node.js 20以上 / npm

### インストールと起動

```bash
git clone https://github.com/vanilla0523-aoi/ai-preflight.git
cd ai-preflight
npm install
npm run dev   # → http://localhost:3000
```

環境変数・APIキーは**不要**です（外部サービスを一切使用しないため）。

### 動作確認

```bash
npm test                            # ユニットテスト（vitest・14ケース）
npm run lint                        # ESLint（エラーなし）
npm run build                       # 本番ビルド（通ることを確認済み）
npx tsx scripts/scanner-check.ts    # Scanner単体でデモ3シナリオを確認
```

ブラウザでは「サンプルを入力」→「送信前チェック」で、CRITICAL判定・検出5件・Safe Prompt生成まで一連の動作を確認できます。

## 6. AI開発ツールの利用

- **利用したAI開発ツール:** Claude（Cowork）
- **自分で判断したこと:** 企画・要件定義の全体（検知カテゴリと優先順位、「Raw Promptを外部LLMへ送らない」というセキュリティ制約、Rule-based中心のチェック方式、社内NGルールを特徴とする構成、PoCの完成条件とスコープ）を要件定義書としてまとめ、AIへの実装指示に使用
- **AIに任せたこと:** 要件定義書に基づくコード実装、動作検証スクリプトの作成と実行、READMEドラフト作成
- **検証について:** lint / build の通過、デモ3シナリオの判定結果、UIのスクリーンショットまで含めてAI側で検証したうえで、成果物を確認

<!-- TODO(あおい): 「AIの提案を採用しなかった例」があれば1行追記。なければこのコメントごと削除 -->

## Future Improvements

管理画面（NGルールのUI設定）／会社・部署別ポリシー（営業部：顧客名・契約金額禁止、開発部：APIキー・コードネーム禁止 など）／ブラウザ拡張（入力の瞬間に自動チェック）／AI Gateway（LLMへのリクエストをProxyし自動検査）／マスク後文章へのLLM意味的チェック／Audit Log（本文は保存しない設計）／Slack・Google Workspace・GitHub等との連携

## Disclaimer

本ツールは機密情報の漏洩を完全に防止するものではありません。所属組織のセキュリティポリシーに従って生成AIをご利用ください。
