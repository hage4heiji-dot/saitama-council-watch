import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavMenu } from "@/components/NavMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "さいたま市議会ウォッチ",
  description: "行政・議会・政治を、市民にわかりやすく。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-surface-page text-ink-primary antialiased">
        <header className="relative border-b border-hairline bg-surface-1">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-bold">
              さいたま市議会ウォッチ
            </Link>
            <NavMenu />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
