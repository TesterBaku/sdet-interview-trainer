"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { QuizRunner } from "@/components/QuizRunner";
import { getCheatSheet, getCheatSheetQuiz } from "@/lib/cheatsheets";

export function CheatSheetQuizClient() {
  const params = useParams<{ id: string }>();
  const sheet = getCheatSheet(params.id);
  const questions = useMemo(() => getCheatSheetQuiz(params.id), [params.id]);

  if (!sheet) {
    return <p className="rounded-2xl bg-white/80 p-6">No quiz questions found for this cheat sheet.</p>;
  }

  return (
    <QuizRunner
      backHref={`/cheatsheets/${sheet.id}`}
      backLabel="Back to cheat sheet"
      completion={
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-950">
          <p className="font-bold">Quiz complete.</p>
          <div className="mt-2 flex flex-wrap gap-4">
            <Link className="font-bold text-signal" href={`/cheatsheets/${sheet.id}`}>
              Back to cheat sheet
            </Link>
            <Link className="font-bold text-signal" href="/quizzes">
              More quizzes
            </Link>
          </div>
        </div>
      }
      emptyMessage="No quiz questions found for this cheat sheet."
      questions={questions}
      title={`${sheet.title} Quiz`}
    />
  );
}
