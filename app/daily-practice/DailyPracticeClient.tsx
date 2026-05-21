"use client";

import Link from "next/link";
import { getDailyPlan } from "@/lib/questionUtils";
import { getRecord, useProgress } from "@/lib/progress";
import type { Question } from "@/types/Question";

function practiceHref(question: Question): string {
  if (question.type === "coding") return `/coding-gym?topic=${question.topicId}`;
  if (question.type === "quiz") return `/quiz/${question.topicId}`;
  if (question.type === "interview" || question.type === "scenario") return `/mock-interview/${question.topicId}`;
  return `/flashcards/${question.topicId}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function DailyPracticeClient() {
  const plan = getDailyPlan();
  const today = dateFormatter.format(new Date());
  const { progress } = useProgress();

  const allItems = plan.flatMap((section) => section.questions);
  const completed = allItems.filter((q) => {
    const record = getRecord(progress, q.id);
    return record && record.status !== "new";
  }).length;
  const percent = allItems.length === 0 ? 0 : Math.round((completed / allItems.length) * 100);

  return (
    <div className="space-y-6">
      <header className="rounded-[2.5rem] border border-ink/10 bg-white/75 p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Daily Practice</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{today}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-8 text-ink/75">
          A focused 10-item mix — same plan all day, fresh tomorrow. Mark each as you go from inside the practice screens.
        </p>
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="font-bold text-blueprint">
            {completed} of {allItems.length} done today
          </p>
          <span className="rounded-full bg-brass/15 px-3 py-1 text-sm font-bold text-blueprint">{percent}%</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-signal" style={{ width: `${percent}%` }} />
        </div>
      </header>

      <div className="space-y-5">
        {plan.map((section) => (
          <section
            className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel"
            key={section.id}
          >
            <h2 className="font-display text-2xl font-bold text-blueprint">{section.title}</h2>
            {section.questions.length === 0 ? (
              <p className="mt-3 leading-7 text-ink/70">No questions available for this section.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {section.questions.map((question) => {
                  const record = getRecord(progress, question.id);
                  return (
                    <li key={question.id}>
                      <Link
                        className="block rounded-2xl bg-paper/80 p-4 transition hover:bg-paper"
                        href={practiceHref(question)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blueprint px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-paper">
                            {question.topicTitle}
                          </span>
                          <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-ink/70">
                            {question.type}
                          </span>
                          {record && record.status !== "new" ? (
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white ${
                                record.status === "weak"
                                  ? "bg-signal"
                                  : record.status === "review"
                                    ? "bg-brass"
                                    : "bg-emerald-700"
                              }`}
                            >
                              {record.status}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 font-bold text-blueprint">{question.title ?? question.question}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
