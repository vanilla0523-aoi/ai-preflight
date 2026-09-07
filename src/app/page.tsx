"use client";

import { useMemo, useState } from "react";
import type { Detection, RiskLevel, ScanResult } from "@/lib/security/types";
import { scanText } from "@/lib/security/scanner";
import { sampleText } from "@/lib/security/sample";

/**
 * AI Preflight — AI送信前セキュリティチェック PoC（1画面完結）
 *
 * セキュリティ方針:
 * - 検知処理はすべてこのコンポーネント内（＝ブラウザ内）で実行され、入力文章はどこへも送信されない
 * - 入力本文を保存・ログ出力・Analytics送信しない
 * - textarea自体からブラウザ機能経由で外部へ出る経路も塞ぐ（下記 textarea の属性を参照）
 */

const RISK_META: Record<
  RiskLevel,
  { label: string; description: string; badge: string; panel: string }
> = {
  safe: {
    label: "SAFE",
    description: "機密情報は検出されませんでした。このまま送信できます。",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
    panel: "border-emerald-200 bg-emerald-50",
  },
  low: {
    label: "LOW",
    description: "軽微な注意事項があります。内容を確認してから送信してください。",
    badge: "bg-amber-100 text-amber-800 border-amber-300",
    panel: "border-amber-200 bg-amber-50",
  },
  high: {
    label: "HIGH",
    description:
      "個人情報または社内ルール違反が含まれています。Safe Promptの利用を推奨します。",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
    panel: "border-orange-200 bg-orange-50",
  },
  critical: {
    label: "CRITICAL",
    description:
      "認証情報が含まれています。このまま外部AIへ送信しないでください。",
    badge: "bg-red-100 text-red-800 border-red-300",
    panel: "border-red-200 bg-red-50",
  },
};

const SEVERITY_BADGE: Record<Detection["severity"], string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-amber-100 text-amber-700 border-amber-300",
  low: "bg-slate-100 text-slate-600 border-slate-300",
};

const SEVERITY_MARK: Record<Detection["severity"], string> = {
  critical: "bg-red-200/80 decoration-red-500",
  high: "bg-orange-200/80 decoration-orange-500",
  medium: "bg-amber-200/80 decoration-amber-500",
  low: "bg-slate-200 decoration-slate-400",
};

type CopyState = "idle" | "copied" | "failed";

/** 元文章の検知箇所ハイライト表示 */
function HighlightedText({ text, detections }: { text: string; detections: Detection[] }) {
  const parts = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    detections.forEach((d, i) => {
      if (d.start > cursor) {
        nodes.push(<span key={`t-${i}`}>{text.slice(cursor, d.start)}</span>);
      }
      nodes.push(
        <mark
          key={`m-${i}`}
          title={d.label}
          className={`rounded px-0.5 underline decoration-2 underline-offset-2 ${SEVERITY_MARK[d.severity]}`}
        >
          {text.slice(d.start, d.end)}
        </mark>
      );
      cursor = d.end;
    });
    if (cursor < text.length) {
      nodes.push(<span key="t-last">{text.slice(cursor)}</span>);
    }
    return nodes;
  }, [text, detections]);

  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{parts}</p>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scannedText, setScannedText] = useState("");
  const [copyState, setCopyState] = useState<CopyState>("idle");

  /**
   * チェック実行後に文章が編集された状態。
   * 古い結果を「安全」と誤認したまま送信されるのを防ぐため、結果を無効扱いにする。
   */
  const isStale = result !== null && input !== scannedText;

  const runScan = () => {
    if (!input.trim()) return;
    setResult(scanText(input));
    setScannedText(input);
    setCopyState("idle");
  };

  const copyText = async (text: string) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      // 非対応環境・権限拒否時は黙って失敗せず、手動コピーを促す
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 4000);
    }
  };

  const copyLabel =
    copyState === "copied"
      ? "コピーしました ✓"
      : copyState === "failed"
        ? "コピーできませんでした"
        : "安全化した文章をコピー";

  const risk = result ? RISK_META[result.riskLevel] : null;
  const showResult = result !== null && risk !== null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* ヘッダー */}
        <header className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <span aria-hidden>✈️</span> AI Preflight — PoC
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AIに送る前に、安全確認。
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            生成AIへ入力する文章から、個人情報・認証情報・社内NG情報をチェックします。
          </p>
        </header>

        {/* 入力エリア */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <label htmlFor="prompt" className="block text-sm font-semibold text-slate-700">
              チェックする文章
            </label>
            <span className="text-xs tabular-nums text-slate-400">
              {input.length.toLocaleString()} 文字
            </span>
          </div>
          <textarea
            id="prompt"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl / Cmd + Enter でチェック実行
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                runScan();
              }
            }}
            placeholder="ChatGPTやClaudeに送る予定の文章を貼り付けてください"
            rows={8}
            /*
             * 機密情報を扱う入力欄のため、ブラウザ機能経由で内容が外部へ出たり
             * 端末に残ったりする経路を明示的に無効化する。
             * - spellCheck: 一部ブラウザの拡張スペルチェックは入力文をベンダーのサーバーへ送信する
             * - autoComplete / autoCorrect / autoCapitalize: 入力履歴として端末に残るのを防ぐ
             * - data-gramm / data-1p-ignore: Grammarly・パスワードマネージャ等の拡張による読み取りを避ける
             */
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-gramm="false"
            data-gramm_editor="false"
            data-enable-grammarly="false"
            data-1p-ignore
            data-lpignore="true"
            className="w-full resize-y rounded-xl border border-slate-300 bg-white p-4 text-sm leading-6 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={runScan}
              disabled={!input.trim()}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              送信前チェック
            </button>
            <button
              onClick={() => {
                setInput(sampleText);
                setResult(null);
                setScannedText("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              サンプルを入力
            </button>
            <span className="text-xs text-slate-400">
              チェックはブラウザ内で完結し、入力内容はどこにも送信されません（⌘/Ctrl + Enter で実行）
            </span>
          </div>
        </section>

        {/* 結果エリア */}
        {showResult && (
          <section className="mt-8 space-y-6" aria-live="polite">
            {/* 入力が編集された場合の再チェック促し */}
            {isStale && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-slate-100 p-4">
                <p className="text-sm font-medium text-slate-700">
                  文章が編集されています。以下は編集前の結果です。
                </p>
                <button
                  onClick={runScan}
                  className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-900"
                >
                  再チェックする
                </button>
              </div>
            )}

            {/* 編集後は古い結果を薄く表示し、安全と誤認されないようにする */}
            <div className={isStale ? "pointer-events-none opacity-40" : undefined}>
              <div className="space-y-6">
                {/* Risk Level */}
                <div className={`rounded-2xl border p-5 ${risk.panel}`}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-bold tracking-wide ${risk.badge}`}
                    >
                      {risk.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      検出 {result.detections.length} 件 / Risk Score {result.riskScore}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-700">{risk.description}</p>
                </div>

                {/* 検出結果一覧 */}
                {result.detections.length > 0 && (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold text-slate-700">検出結果</h2>
                    <ul className="space-y-3">
                      {result.detections.map((d) => (
                        <li
                          key={d.id}
                          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold uppercase ${SEVERITY_BADGE[d.severity]}`}
                            >
                              {d.severity}
                            </span>
                            <span className="text-sm font-semibold text-slate-800">{d.label}</span>
                            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                              {d.display}
                            </code>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{d.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 元文章ハイライト */}
                {result.detections.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-3 text-sm font-semibold text-slate-700">該当箇所</h2>
                    <HighlightedText text={scannedText} detections={result.detections} />
                  </div>
                )}

                {/* Safe Prompt（SAFE判定時も、そのまま使える文章としてコピーできるようにする） */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-slate-700">
                      {result.detections.length > 0
                        ? "Safe Prompt（機密情報をマスクした文章）"
                        : "送信する文章"}
                    </h2>
                    <button
                      onClick={() => copyText(result.safePrompt)}
                      aria-live="polite"
                      className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${
                        copyState === "failed"
                          ? "bg-slate-500 hover:bg-slate-600"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {result.detections.length > 0 ? copyLabel : "文章をコピー"}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-white p-4 font-mono text-sm leading-6 text-slate-700">
                    {result.safePrompt}
                  </pre>
                  <p className="mt-2 text-xs text-slate-500">
                    {copyState === "failed"
                      ? "お使いのブラウザではコピー機能を利用できません。上の文章を選択してコピーしてください。"
                      : "マスクした文章をコピーして、任意の生成AIへ入力してください。"}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <footer className="mt-12 border-t border-slate-200 pt-6 text-center">
          <p className="text-xs leading-5 text-slate-400">
            本ツールは機密情報の漏洩を完全に防止するものではありません。
            所属組織のセキュリティポリシーに従って生成AIをご利用ください。
          </p>
        </footer>
      </main>
    </div>
  );
}
