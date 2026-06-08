import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cheatSheets, getCheatSheet } from "@/lib/cheatsheets";

export function generateStaticParams() {
  return cheatSheets.map((sheet) => ({ id: sheet.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sheet = getCheatSheet(id);
  return {
    title: sheet ? `${sheet.title} Cheat Sheet | SDET Interview Trainer` : "Cheat Sheet | SDET Interview Trainer",
    description: sheet?.summary ?? "SDET interview-prep cheat sheet.",
    openGraph: { url: `/cheatsheets/${id}` },
  };
}

export default async function CheatSheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sheet = getCheatSheet(id);
  if (!sheet) notFound();

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-white/75 p-6 pl-7 shadow-panel sm:p-8 sm:pl-9">
        <span aria-hidden className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: sheet.accent }} />
        <Link className="text-sm font-bold text-signal" href="/cheatsheets">
          Back to cheat sheets
        </Link>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.28em]" style={{ color: sheet.accent }}>
          {sheet.group}
        </p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{sheet.title}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/75">{sheet.summary}</p>
        <div className="mt-5">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-signal px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b93e1f] focus-ring"
            href={`/cheatsheets/${sheet.id}/quiz`}
          >
            Take the {sheet.quiz.length}-question quiz →
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-ink/10 bg-white/70 p-4 shadow-panel">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-ink/55">On this page</p>
            <ol className="space-y-2 text-sm">
              {sheet.sections.map((section, i) => (
                <li key={section.id}>
                  <a className="flex gap-2 text-ink/75 transition hover:text-signal" href={`#${section.id}`}>
                    <span className="font-mono text-xs text-ink/40">{String(i + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="space-y-5">
          {sheet.sections.map((section, i) => (
            <section
              className="scroll-mt-24 rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-panel sm:p-8"
              id={section.id}
              key={section.id}
            >
              <h2 className="flex items-baseline gap-3 font-display text-2xl font-black text-blueprint">
                <span className="font-mono text-base font-bold" style={{ color: sheet.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              <div
                className="cheatsheet-prose mt-4"
                // Content is the user's own static study files, converted at build time (no user input).
                dangerouslySetInnerHTML={{ __html: section.bodyHtml }}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
