"use client";

import Link from "next/link";
import { ProgressSummary } from "@/components/ProgressSummary";
import { allQuestions, topics } from "@/lib/questionUtils";
import { summarizeProgress, summarizeTopicProgress, useProgress } from "@/lib/progress";

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
    </div>
  );
}
