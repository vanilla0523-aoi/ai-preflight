import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Preflight — AIに送る前に、安全確認。",
  description:
    "生成AIへ入力する文章から、個人情報・認証情報・社内NG情報をチェックするPoCツール。",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
