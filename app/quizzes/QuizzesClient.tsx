"use client";

import Link from "next/link";
import { cheatSheets, cheatSheetsByGroup } from "@/lib/cheatsheets";
import { summarizeProgress, useProgress } from "@/lib/progress";

export function QuizzesClient() {
  const { progress } = useProgress();
  // Only sheets with an inline quiz appear here; cheat sheets backed by a dedicated
  // mock exam (e.g. the CCA cert) have an empty quiz and are reached via /mock-exam.
  const groups = cheatSheetsByGroup()
    .map((bucket) => ({ ...bucket, sheets: bucket.sheets.filter((sheet) => sheet.quiz.length > 0) }))
    .filter((bucket) => bucket.sheets.length > 0);
  const totalQuestions = cheatSheets.reduce((sum, sheet) => sum + sheet.quiz.length, 0);
  const quizzableCount = cheatSheets.filter((sheet) => sheet.quiz.length > 0).length;

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Quizzes</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">Learn through quizzes</h1>
        <p className="mt-4 text-lg leading-8 text-ink/75">
          {totalQuestions} multiple-choice questions across {quizzableCount} topics, drawn from the{" "}
          <Link className="font-bold text-signal" href="/cheatsheets">
            cheat sheets
          </Link>
          . Each question gives immediate feedback and an explanation.
        </p>
      </header>

      {groups.map(({ group, sheets }) => (
        <section className="space-y-4" key={group}>
          <h2 className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.28em] text-ink/55">
            {group}
            <span className="h-px flex-1 bg-ink/10" />
          </h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sheets.map((sheet) => {
              const summary = summarizeProgress(progress, sheet.quiz.map((q) => q.id));
              return (
                <Link
                  className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-ink/10 bg-white/75 p-5 pl-6 shadow-panel transition hover:-translate-y-1 hover:bg-white"
                  href={`/cheatsheets/${sheet.id}/quiz`}
                  key={sheet.id}
                >
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: sheet.accent }} />
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-2xl font-bold text-blueprint">{sheet.title}</h3>
                    <span className="text-sm font-bold text-ink/60">{sheet.quiz.length} Q</span>
                  </div>
                  <div className="mt-auto pt-5">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Answered</span>
                      <span>
                        {summary.completedQuestions}/{summary.totalQuestions}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-signal" style={{ width: `${summary.percentComplete}%` }} />
                    </div>
                  </div>
                  <span className="mt-4 text-sm font-bold text-signal">Start quiz →</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
