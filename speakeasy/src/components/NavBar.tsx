"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

const LINKS = [
  { href: "/vocabulary", label: "Vocabulary", icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5V4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z" },
  { href: "/practice", label: "Practice", icon: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm7 10a7 7 0 0 1-14 0M12 19v3" },
  { href: "/journal", label: "Journal", icon: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" },
  { href: "/account", label: "Account", icon: "M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" },
];

export function NavBar({ username }: { username: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/vocabulary" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight">
          <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-xl bg-accent text-sm text-white">
            S
          </span>
          <span className="hidden sm:inline">SpeakEasy</span>
        </Link>
        <ul className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-ink",
                  )}
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={link.icon} />
                  </svg>
                  <span className="hidden min-[520px]:inline">{link.label}</span>
                  <span className="sr-only min-[520px]:hidden">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        <span className="hidden text-sm text-muted md:inline" title="Signed in">
          {username}
        </span>
      </nav>
    </header>
  );
}
