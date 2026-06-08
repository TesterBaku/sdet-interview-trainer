import type { Metadata } from "next";
import Link from "next/link";
import { CheatSheetCard } from "@/components/CheatSheetCard";
import { cheatSheets, cheatSheetsByGroup } from "@/lib/cheatsheets";

export const metadata: Metadata = {
  title: "Cheat Sheets | SDET Interview Trainer",
  description:
    "Concept cheat sheets for SDET interviews — Playwright, Selenium, TestNG, SQL, PySpark, Docker, Kubernetes, Python, Java, JavaScript, C#, and API testing.",
  openGraph: { url: "/cheatsheets" },
};

export default function CheatSheetsPage() {
  const groups = cheatSheetsByGroup();

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Cheat Sheets</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">Study the core concepts</h1>
        <p className="mt-4 text-lg leading-8 text-ink/75">
          {cheatSheets.length} focused reference pages — read the concepts, then{" "}
          <Link className="font-bold text-signal" href="/quizzes">
            test yourself with quizzes
          </Link>
          .
        </p>
      </header>

      {groups.map(({ group, sheets }) => (
        <section className="space-y-4" key={group}>
          <h2 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.28em] text-ink/55">
            {group}
            <span className="h-px flex-1 bg-ink/10" />
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sheets.map((sheet) => (
              <CheatSheetCard key={sheet.id} sheet={sheet} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
