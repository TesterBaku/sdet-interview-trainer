"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { QuizQuestion } from "@/components/QuizQuestion";
import { useShuffledList } from "@/lib/useShuffledList";
import { useProgress } from "@/lib/progress";
import type { Question } from "@/types/Question";

type QuizRunnerProps = {
  title: string;
  questions: Question[];
  backHref: string;
  backLabel: string;
  completion: ReactNode;
  initialIndex?: number;
  emptyMessage?: string;
};

// Shared single-choice quiz flow used by both the topic quizzes (/quiz/[topicId])
// and the cheat-sheet quizzes (/cheatsheets/[id]/quiz).
export function QuizRunner({
  title,
  questions,
  backHref,
  backLabel,
  completion,
  initialIndex = 0,
  emptyMessage = "No quiz questions found.",
}: QuizRunnerProps) {
  const { list: displayQuestions, shuffled, toggle } = useShuffledList(questions);
  const [index, setIndex] = useState(initialIndex);
  const [isComplete, setIsComplete] = useState(false);
  const { updateQuestion } = useProgress();
  const question = displayQuestions[index];

  if (!question) {
    return <p className="rounded-2xl bg-white/80 p-6">{emptyMessage}</p>;
  }

  function completeCurrentQuestion(isCorrect: boolean) {
    updateQuestion(question.id, isCorrect ? "known" : "review");

    if (index === displayQuestions.length - 1) {
      setIsComplete(true);
      return;
    }

    setIndex((current) => current + 1);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-signal" href={backHref}>
            {backLabel}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`rounded-full border px-4 py-2 text-sm font-bold shadow-panel focus-ring transition ${shuffled ? "border-signal/40 bg-signal/10 text-signal" : "border-ink/15 bg-white/80 text-ink"}`}
            onClick={() => toggle(() => { setIndex(0); setIsComplete(false); })}
            type="button"
          >
            {shuffled ? "Reset order" : "Shuffle"}
          </button>
          <p className="font-bold text-ink/60">Question {index + 1} of {displayQuestions.length}</p>
        </div>
      </header>
      <QuizQuestion
        isFinalQuestion={index === displayQuestions.length - 1}
        key={question.id}
        onComplete={completeCurrentQuestion}
        question={question}
      />
      {isComplete ? (
        completion
      ) : index === displayQuestions.length - 1 ? (
        <p className="rounded-2xl bg-white/75 p-4 text-ink/70">You are on the final quiz question.</p>
      ) : null}
    </div>
  );
}
