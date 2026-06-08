"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/daily-practice", label: "Daily" },
  { href: "/topics", label: "Topics" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
  { href: "/quizzes", label: "Quizzes" },
  { href: "/mock-exam", label: "Mock Exam" },
  { href: "/coding-gym", label: "Coding Gym" },
  { href: "/review", label: "Review" },
  { href: "/progress", label: "Progress" }
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
        return (
          <Link
            className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-ring ${
              isActive ? "bg-ink text-paper" : "bg-white/70 text-ink hover:bg-white"
            }`}
            href={link.href}
            key={link.href}
            onClick={onNavigate}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/85 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <Link className="font-display text-xl font-bold tracking-tight text-blueprint sm:text-2xl" href="/">
            SDET Interview Trainer
          </Link>

          {/* Desktop: full link row */}
          <div className="hidden flex-wrap justify-end gap-2 sm:flex">
            <NavLinks pathname={pathname} />
          </div>

          {/* Mobile: menu toggle */}
          <button
            aria-controls="primary-nav"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-ink transition hover:bg-white focus-ring sm:hidden"
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <svg aria-hidden fill="none" height="20" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="20">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile: collapsible link panel */}
        <div className={`${open ? "flex" : "hidden"} flex-wrap gap-2 pt-3 sm:hidden`} id="primary-nav">
          <NavLinks onNavigate={() => setOpen(false)} pathname={pathname} />
        </div>
      </nav>
    </header>
  );
}
