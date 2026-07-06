import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "さいたま市議会ウォッチ",
  description: "行政・議会・政治を、市民にわかりやすく。",
};

const NAV_LINKS = [
  { href: "/legislators", label: "議員一覧" },
  { href: "/meetings", label: "会議・議案" },
  { href: "/search", label: "検索" },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-surface-page text-ink-primary antialiased">
        <header className="border-b border-hairline bg-surface-1">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-bold">
              さいたま市議会ウォッチ
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-ink-secondary hover:text-ink-primary">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
