import type { OrganizationRule } from "./types";

/**
 * 社内 NG ルール（Organization Policy）設定ファイル。
 *
 * 企業ごとに「生成AIへ入力してはいけない情報」をここで定義する。
 * PoC では管理画面を作らず、この配列を編集することでルールを追加・変更する。
 * keywords は大文字小文字を無視した完全一致（部分文字列一致）で検知される。
 */
export const organizationRules: OrganizationRule[] = [
  {
    id: "project-name",
    label: "未公開プロジェクト名",
    keywords: ["Project Raven", "Project Phoenix"],
    severity: "high",
    message:
      "未公開プロジェクト名は外部AIへ送信できません。開発中プロジェクトの存在自体が社外秘情報です。",
    maskToken: "[PROJECT_NAME]",
  },
  {
    id: "customer-name",
    label: "重要顧客",
    keywords: ["株式会社サンプル", "Example Corporation"],
    severity: "high",
    message:
      "顧客名は匿名化してください。取引関係の存在は顧客との守秘義務の対象となる場合があります。",
    maskToken: "[CUSTOMER]",
  },
  {
    id: "internal-system",
    label: "社内システム名",
    keywords: ["社内基幹システムHARMONY"],
    severity: "medium",
    message: "社内システム名は外部AIへ送信しないことを推奨します。",
    maskToken: "[INTERNAL_SYSTEM]",
  },
];
