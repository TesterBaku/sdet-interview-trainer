"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InstallAppButton } from "@/components/InstallAppButton";
import { useDismissable } from "@/lib/useDismissable";

type NavLink = {
  href: string;
  label: string;
  // Extra route prefixes that should light up this lane (sub-modes folded into it).
  match?: string[];
};

// Primary lanes. Home lives on the wordmark (left). Daily / Topics / Quizzes are
// folded into the Practice hub; Review is folded into Progress.
const links: NavLink[] = [
  { href: "/practice", label: "Practice", match: ["/topics", "/quizzes", "/quiz", "/daily-practice", "/flashcards", "/mock-interview", "/commute"] },
  { href: "/coding-gym", label: "Coding Gym" },
  { href: "/mock-exam", label: "Mock Exam" },
  { href: "/cheatsheets", label: "Cheat Sheets" },
  { href: "/progress", label: "Progress", match: ["/review"] }
];

function isLaneActive(pathname: string, link: NavLink): boolean {
  // Match the lane's own route plus any folded-in sub-routes, on a path boundary
  // so "/quiz" never spuriously matches "/quizzes".
  return [link.href, ...(link.match ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {links.map((link) => {
        const isActive = isLaneActive(pathname, link);
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
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // While the mobile menu is open, dismiss it on Escape (returning focus to the
  // toggle) or on a tap/click outside the nav — the expected disclosure behavior.
  useDismissable({
    open,
    onClose: () => setOpen(false),
    insideRefs: [navRef],
    focusRef: toggleRef,
  });

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/85 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8" ref={navRef}>
        <div className="flex items-center justify-between gap-3">
          <Link className="font-display text-xl font-bold tracking-tight text-blueprint sm:text-2xl" href="/">
            SDET Interview Trainer
          </Link>

          <div className="flex items-center gap-2">
            {/* Install-as-app affordance — shows only when the browser supports it */}
            <InstallAppButton />

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
              ref={toggleRef}
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
        </div>

        {/* Mobile: collapsible link panel */}
        <div className={`${open ? "flex" : "hidden"} flex-wrap gap-2 pt-3 sm:hidden`} id="primary-nav">
          <NavLinks onNavigate={() => setOpen(false)} pathname={pathname} />
        </div>
      </nav>
    </header>
  );
}
