"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/legislators", label: "議員一覧" },
  { href: "/meetings", label: "会議・議案" },
  { href: "/search", label: "検索" },
  { href: "/analysis", label: "クロス集計" },
  { href: "/milestones", label: "年間マイルストーン" },
  { href: "/budget", label: "予算" },
  { href: "/ordinances", label: "条例一覧" },
  { href: "/petitions", label: "請願一覧" },
];

/**
 * md未満では横並びnavが日本語1文字ずつ折り返され、ヘッダーが画面の1/4以上を
 * 占有していた。md以上は従来通りの横並び、md未満はハンバーガー+ドロップダウンにする。
 */
export function NavMenu() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden gap-4 text-sm md:flex">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-ink-secondary hover:text-ink-primary">
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        className="flex h-9 w-9 items-center justify-center rounded border border-hairline md:hidden"
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-ink-primary stroke-2">
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          id="mobile-nav-menu"
          className="absolute inset-x-0 top-full border-b border-hairline bg-surface-1 px-6 py-2 md:hidden"
        >
          <ul className="flex flex-col divide-y divide-hairline text-sm">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-ink-secondary hover:text-ink-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
