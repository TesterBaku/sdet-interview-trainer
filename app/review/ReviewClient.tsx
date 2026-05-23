"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { allQuestions, topics } from "@/lib/questionUtils";
import { useProgress } from "@/lib/progress";
import { practiceHref } from "@/lib/practiceHref";
import type { Question } from "@/types/Question";

type StatusFilter = "all" | "weak" | "review";
type TypeFilter = "all" | "coding" | "interview" | "quiz";

function ReviewInner() {
  const searchParams = useSearchParams();
  const rawStatus = searchParams.get("status");
  const status: StatusFilter = rawStatus === "weak" || rawStatus === "review" ? rawStatus : "all";
  const rawType = searchParams.get("type");
  const typeFilter: TypeFilter =
    rawType === "coding" || rawType === "interview" || rawType === "quiz" ? rawType : "all";
  const rawTopic = searchParams.get("topic");
  const topicFilter = rawTopic && topics.some((t) => t.id === rawTopic) ? rawTopic : "all";
  const { progress } = useProgress();

  const flaggedRecords = progress.records.filter(
    (record) => record.status === "weak" || record.status === "review"
  );

  const items = flaggedRecords
    .map((record) => {
      const question = allQuestions.find((q) => q.id === record.questionId);
      return question ? { record, question } : null;
    })
    .filter((item): item is { record: typeof flaggedRecords[number]; question: Question } => item !== null)
    .filter((item) => (status === "all" ? true : item.record.status === status))
    .filter((item) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "coding") return item.question.type === "coding";
      if (typeFilter === "interview") return item.question.type === "interview" || item.question.type === "scenario";
      if (typeFilter === "quiz") return item.question.type === "quiz";
      return true;
    })
    .filter((item) => (topicFilter === "all" ? true : item.question.topicId === topicFilter));

  function chipHref(next: Partial<{ status: StatusFilter; type: TypeFilter; topic: string }>): string {
    const params = new URLSearchParams();
    const merged = { status, type: typeFilter, topic: topicFilter, ...next };
    if (merged.status !== "all") params.set("status", merged.status);
    if (merged.type !== "all") params.set("type", merged.type);
    if (merged.topic !== "all") params.set("topic", merged.topic);
    const qs = params.toString();
    return qs ? `/review?${qs}` : "/review";
  }

  const filterChips: { label: string; href: string; active: boolean }[] = [
    { label: "All statuses", href: chipHref({ status: "all" }), active: status === "all" },
    { label: "Weak only", href: chipHref({ status: "weak" }), active: status === "weak" },
    { label: "Review later", href: chipHref({ status: "review" }), active: status === "review" },
  ];

  const typeChips: { label: string; href: string; active: boolean }[] = [
    { label: "All types", href: chipHref({ type: "all" }), active: typeFilter === "all" },
    { label: "Coding only", href: chipHref({ type: "coding" }), active: typeFilter === "coding" },
    { label: "Interview only", href: chipHref({ type: "interview" }), active: typeFilter === "interview" },
    { label: "Quiz only", href: chipHref({ type: "quiz" }), active: typeFilter === "quiz" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Review</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">Weak &amp; review queue</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/75">
          Every question you marked as weak or review-later, across all topics. Click through to practice it in the right mode.
        </p>
      </header>

      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
        <h2 className="font-display text-2xl font-bold text-blueprint">Filters</h2>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/55">Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {filterChips.map((chip) => (
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-bold transition focus-ring ${
                    chip.active ? "bg-ink text-paper" : "bg-paper/70 text-ink hover:bg-paper"
                  }`}
                  href={chip.href}
                  key={chip.label}
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/55">Type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {typeChips.map((chip) => (
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-bold transition focus-ring ${
                    chip.active ? "bg-ink text-paper" : "bg-paper/70 text-ink hover:bg-paper"
                  }`}
                  href={chip.href}
                  key={chip.label}
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/55">Topic</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                className={`rounded-full px-4 py-2 text-sm font-bold transition focus-ring ${
                  topicFilter === "all" ? "bg-ink text-paper" : "bg-paper/70 text-ink hover:bg-paper"
                }`}
                href={chipHref({ topic: "all" })}
              >
                All topics
              </Link>
              {topics.map((topic) => (
                <Link
                  className={`rounded-full px-4 py-2 text-sm font-bold transition focus-ring ${
                    topicFilter === topic.id ? "bg-ink text-paper" : "bg-paper/70 text-ink hover:bg-paper"
                  }`}
                  href={chipHref({ topic: topic.id })}
                  key={topic.id}
                >
                  {topic.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
        <h2 className="font-display text-2xl font-bold text-blueprint">
          {items.length} {items.length === 1 ? "question" : "questions"}
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 leading-7 text-ink/70">
            Nothing matches these filters. Mark questions as weak or review during practice to populate this queue.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map(({ record, question }) => (
              <li key={record.questionId}>
                <Link
                  className="block rounded-2xl bg-paper/80 p-4 transition hover:bg-paper"
                  href={practiceHref(question)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blueprint px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-paper">
                      {question.topicTitle}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white ${
                        record.status === "weak" ? "bg-signal" : "bg-brass"
                      }`}
                    >
                      {record.status}
                    </span>
                    <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink/70">
                      {question.type}
                    </span>
                  </div>
                  <p className="mt-3 font-bold text-blueprint">{question.title ?? question.question}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function ReviewClient() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white/80 p-6">Loading…</div>}>
      <ReviewInner />
    </Suspense>
  );
}
