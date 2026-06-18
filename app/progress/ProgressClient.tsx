"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ProgressSummary } from "@/components/ProgressSummary";
import { allQuestions, topics } from "@/lib/questionUtils";
import { summarizeProgress, summarizeTopicProgress, useProgress } from "@/lib/progress";
import { writeProgress } from "@/lib/storage";
import { parseProgressImport, serializeProgress } from "@/lib/progressTransfer";

type TransferStatus = { kind: "success" | "error"; message: string } | null;

const codingQuestionIds = allQuestions.filter((q) => q.type === "coding").map((q) => q.id);
const quizQuestionIds = allQuestions
  .filter((q) => q.type === "quiz" && q.choices?.length && q.correctAnswer)
  .map((q) => q.id);
const interviewQuestionIds = allQuestions
  .filter((q) => q.type === "interview" || q.type === "scenario")
  .map((q) => q.id);

export function ProgressClient() {
  const { progress } = useProgress();
  const overall = summarizeProgress(progress);
  const coding = summarizeProgress(progress, codingQuestionIds);
  const quiz = summarizeProgress(progress, quizQuestionIds);
  const mockInterview = summarizeProgress(progress, interviewQuestionIds);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<TransferStatus>(null);

  function handleExport() {
    const json = serializeProgress(progress, new Date().toISOString());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `sdet-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus({ kind: "success", message: `Exported ${progress.records.length} records.` });
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so selecting the same file again still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }

    const result = parseProgressImport(await file.text());
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error });
      return;
    }

    if (
      progress.records.length > 0 &&
      !window.confirm("Importing replaces the progress saved on this device. Continue?")
    ) {
      return;
    }

    writeProgress(result.progress);
    setStatus({ kind: "success", message: `Imported ${result.progress.records.length} records.` });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Progress</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">Track readiness by topic</h1>
      </header>

      <ProgressSummary summary={overall} title="Overall Progress" />

      <div className="grid gap-5 lg:grid-cols-3">
        <ProgressSummary summary={coding} title="Coding Progress" />
        <ProgressSummary summary={quiz} title="Quiz Progress" />
        <ProgressSummary summary={mockInterview} title="Mock Interview Progress" />
      </div>

      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-3xl font-bold text-blueprint">Weak &amp; Review queue</h2>
          <Link className="text-sm font-bold text-signal underline focus-ring" href="/review">
            Open Review →
          </Link>
        </div>
        <p className="mt-2 text-ink/70">
          {overall.weakQuestions} weak · {overall.reviewQuestions} review-later questions saved across all topics.
        </p>
      </section>

      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
        <h2 className="font-display text-3xl font-bold text-blueprint">Topic breakdown</h2>
        <div className="mt-5 grid gap-3">
          {topics.map((topic) => {
            const topicSummary = summarizeTopicProgress(progress, topic.id);
            return (
              <Link
                className="rounded-2xl bg-paper/80 p-4 transition hover:bg-paper"
                href={`/topics/${topic.id}`}
                key={topic.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-blueprint">{topic.title}</h3>
                    <p className="text-sm text-ink/60">
                      {topicSummary.completedQuestions}/{topicSummary.totalQuestions} completed, {topicSummary.weakQuestions} weak
                    </p>
                  </div>
                  <span className="font-black text-signal">{topicSummary.percentComplete}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-signal" style={{ width: `${topicSummary.percentComplete}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
        <h2 className="font-display text-3xl font-bold text-blueprint">Backup &amp; restore</h2>
        <p className="mt-2 text-ink/70">
          Your progress is saved <strong>only on this device</strong> (in this browser). Clearing your
          browser data or switching devices loses it. Export a backup to keep it safe or move it elsewhere.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full bg-blueprint px-5 py-2 text-sm font-bold text-paper transition hover:bg-blueprint/90 focus-ring"
          >
            Export progress
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-blueprint/30 px-5 py-2 text-sm font-bold text-blueprint transition hover:bg-blueprint/5 focus-ring"
          >
            Import progress
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="sr-only"
            aria-label="Import progress backup file"
          />
        </div>
        {status ? (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 text-sm font-bold ${status.kind === "error" ? "text-signal" : "text-blueprint"}`}
          >
            {status.message}
          </p>
        ) : null}
      </section>
    </div>
  );
}
