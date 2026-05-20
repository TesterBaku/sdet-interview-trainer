"use client";

import { CodingTaskCard } from "@/components/CodingTaskCard";
import { getCodingQuestions } from "@/lib/questionUtils";
import { getRecord, useProgress } from "@/lib/progress";

export function CodingGymClient() {
  const questions = getCodingQuestions();
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
      </header>
      <div className="grid gap-5 lg:grid-cols-2">
        {questions.map((question) => (
          <CodingTaskCard
            currentStatus={getRecord(progress, question.id)?.status}
            key={question.id}
            onMark={(status) => updateQuestion(question.id, status)}
            question={question}
          />
        ))}
      </div>
    </div>
  );
}
