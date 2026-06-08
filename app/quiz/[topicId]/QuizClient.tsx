"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { QuizRunner } from "@/components/QuizRunner";
import { getQuizQuestions, getTopic } from "@/lib/questionUtils";

export function QuizClient() {
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();
  const topic = getTopic(params.topicId);
  const questions = useMemo(() => getQuizQuestions(params.topicId), [params.topicId]);
  const initialIndex = useMemo(() => {
    const requestedQuestionId = searchParams.get("question");
    const requestedIndex = requestedQuestionId
      ? questions.findIndex((question) => question.id === requestedQuestionId)
      : -1;
    return requestedIndex >= 0 ? requestedIndex : 0;
  }, [searchParams, questions]);

  if (!topic) {
    return <p className="rounded-2xl bg-white/80 p-6">No quiz questions found for this topic.</p>;
  }

  return (
    <QuizRunner
      backHref={`/topics/${topic.id}`}
      backLabel="Back to topic"
      completion={
        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-950">
          <p className="font-bold">Quiz complete.</p>
          <Link className="mt-2 inline-block font-bold text-signal" href={`/topics/${topic.id}`}>
            Back to topic
          </Link>
        </div>
      }
      emptyMessage="No quiz questions found for this topic."
      initialIndex={initialIndex}
      questions={questions}
      title={`${topic.title} Quiz`}
    />
  );
}
