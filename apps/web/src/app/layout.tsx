import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import type { ReactNode } from "react";
import { NavMenu } from "@/components/NavMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "さいたま市議会ウォッチ",
  description: "行政・議会・政治を、市民にわかりやすく。",
  metadataBase: new URL("https://saitamashi-watch.com"),
  openGraph: {
    title: "さいたま市議会ウォッチ",
    description: "行政・議会・政治を、市民にわかりやすく。",
    url: "https://saitamashi-watch.com",
    siteName: "さいたま市議会ウォッチ",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@saitamashiwatch",
  },
};

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-surface-page text-ink-primary antialiased">
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        <header className="relative border-b border-hairline bg-surface-1">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Link href="/" className="font-bold">
              さいたま市議会ウォッチ
            </Link>
            <NavMenu />
          </div>
        </header>
        {children}
        <footer className="border-t border-hairline bg-surface-1">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 text-sm">
            <span className="text-ink-secondary">さいたま市議会ウォッチ</span>
            <a
              href="https://x.com/saitamashiwatch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-secondary hover:text-ink-primary"
            >
              X (旧Twitter)
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
