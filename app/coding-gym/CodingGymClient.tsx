"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CodingTaskCard } from "@/components/CodingTaskCard";
import { getCodingQuestions, getCodingQuestionsByTopic, getTopic } from "@/lib/questionUtils";
import { getRecord, useProgress } from "@/lib/progress";

function CodingGymInner() {
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topic") ?? "";
  const requestedQuestionId = searchParams.get("question") ?? "";
  const topic = topicId ? getTopic(topicId) : undefined;
  const questions = topic ? getCodingQuestionsByTopic(topic.id) : getCodingQuestions();
  const orderedQuestions = requestedQuestionId
    ? [
        ...questions.filter((question) => question.id === requestedQuestionId),
        ...questions.filter((question) => question.id !== requestedQuestionId),
      ]
    : questions;
  const { progress, updateQuestion } = useProgress();

  return (
    <div className="space-y-6">
      <header className="rounded-[2.5rem] border border-ink/10 bg-white/75 p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Coding Gym</p>
        <h1 className="mt-3 font-display text-3xl font-black text-blueprint sm:text-5xl">QA-flavored coding reps</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          Practice coding tasks from Python, Java, SQL/PostgreSQL, Playwright, Selenium, and API testing. No live code
          runner is needed for the MVP; focus on recognizing patterns and explaining tradeoffs.
        </p>
        {topic ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-paper/70 p-4">
            <span className="font-bold text-blueprint">
              Showing {orderedQuestions.length} {orderedQuestions.length === 1 ? "task" : "tasks"} for {topic.title}
            </span>
            <a className="text-sm font-bold text-signal underline focus-ring" href="/coding-gym">
              Show all topics
            </a>
          </div>
        ) : null}
      </header>
      {orderedQuestions.length === 0 ? (
        <p className="rounded-2xl bg-white/80 p-6">No coding tasks found for this topic.</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {orderedQuestions.map((question) => (
            <CodingTaskCard
              currentStatus={getRecord(progress, question.id)?.status}
              key={question.id}
              onMark={(status) => updateQuestion(question.id, status)}
              question={question}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CodingGymFallback() {
  return (
    <div className="rounded-2xl bg-white/80 p-6 shadow-panel">
      <p className="font-bold text-blueprint" role="status" aria-live="polite">
        Loading coding tasks…
      </p>
      <noscript>
        <p className="mt-2 text-ink/75">
          Coding Gym needs JavaScript to run. Enable it, or browse the tasks by topic from the{" "}
          {/* next/link can't hydrate without JS; a plain anchor is the correct escape hatch here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="font-bold text-signal underline" href="/topics">
            Topics
          </a>{" "}
          page.
        </p>
      </noscript>
    </div>
  );
}

export function CodingGymClient() {
  return (
    <Suspense fallback={<CodingGymFallback />}>
      <CodingGymInner />
    </Suspense>
  );
}
