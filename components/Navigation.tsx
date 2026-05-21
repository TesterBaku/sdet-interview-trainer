"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/topics", label: "Topics" },
  { href: "/coding-gym", label: "Coding Gym" },
  { href: "/review", label: "Review" },
  { href: "/progress", label: "Progress" }
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-paper/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link className="font-display text-xl font-bold tracking-tight text-blueprint sm:text-2xl" href="/">
          SDET Interview Trainer
        </Link>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-ring ${
                  isActive ? "bg-ink text-paper" : "bg-white/70 text-ink hover:bg-white"
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
