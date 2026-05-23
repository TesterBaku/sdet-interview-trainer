"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { QuizQuestion } from "@/components/QuizQuestion";
import { getQuizQuestions, getTopic } from "@/lib/questionUtils";
import { useProgress } from "@/lib/progress";

export function QuizClient() {
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();
  const topic = getTopic(params.topicId);
  const questions = getQuizQuestions(params.topicId);
  const [index, setIndex] = useState(() => {
    const requestedQuestionId = searchParams.get("question");
    const requestedIndex = requestedQuestionId
      ? questions.findIndex((question) => question.id === requestedQuestionId)
      : -1;
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const [isComplete, setIsComplete] = useState(false);
  const { updateQuestion } = useProgress();
  const question = questions[index];

  if (!topic || !question) {
    return <p className="rounded-2xl bg-white/80 p-6">No quiz questions found for this topic.</p>;
  }

  function completeCurrentQuestion(isCorrect: boolean) {
    updateQuestion(question.id, isCorrect ? "known" : "review");

    if (index === questions.length - 1) {
      setIsComplete(true);
      return;
    }

    setIndex((current) => current + 1);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-signal" href={`/topics/${topic.id}`}>Back to topic</Link>
          <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{topic.title} Quiz</h1>
        </div>
        <p className="font-bold text-ink/60">Question {index + 1} of {questions.length}</p>
      </header>
      <QuizQuestion
        isFinalQuestion={index === questions.length - 1}
        key={question.id}
        onComplete={completeCurrentQuestion}
        question={question}
      />
      {isComplete ? (
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-950">
          <p className="font-bold">Quiz complete.</p>
          <Link className="mt-2 inline-block font-bold text-signal" href={`/topics/${topic.id}`}>
            Back to topic
          </Link>
        </div>
      ) : index === questions.length - 1 ? (
        <p className="rounded-2xl bg-white/75 p-4 text-ink/70">You are on the final quiz question for this topic.</p>
      ) : null}
    </div>
  );
}
