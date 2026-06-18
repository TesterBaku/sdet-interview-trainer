"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Flashcard } from "@/components/Flashcard";
import { getFlashcardQuestions, getTopic } from "@/lib/questionUtils";
import { useShuffledList } from "@/lib/useShuffledList";
import { getRecord, useProgress } from "@/lib/progress";

export function FlashcardsClient() {
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();
  const topic = getTopic(params.topicId);
  const questions = useMemo(() => getFlashcardQuestions(params.topicId), [params.topicId]);
  const { list: displayQuestions, shuffled, toggle } = useShuffledList(questions);
  const [index, setIndex] = useState(() => {
    const requestedQuestionId = searchParams.get("question");
    const requestedIndex = requestedQuestionId
      ? questions.findIndex((question) => question.id === requestedQuestionId)
      : -1;
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const { progress, updateQuestion } = useProgress();
  const question = displayQuestions[index];

  if (!topic) {
    return <p className="rounded-2xl bg-white/80 p-6">Topic not found.</p>;
  }

  if (!question) {
    return <p className="rounded-2xl bg-white/80 p-6">No flashcards available for this topic.</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-signal" href={`/topics/${topic.id}`}>
            Back to topic
          </Link>
          <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{topic.title} Flashcards</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`rounded-full border px-4 py-2 text-sm font-bold shadow-panel focus-ring transition ${shuffled ? "border-signal/40 bg-signal/10 text-signal" : "border-ink/15 bg-white/80 text-ink"}`}
            onClick={() => toggle(() => setIndex(0))}
            type="button"
          >
            {shuffled ? "Reset order" : "Shuffle"}
          </button>
          <p className="font-bold text-ink/60">
            Card {index + 1} of {displayQuestions.length}
          </p>
        </div>
      </header>
      <Flashcard
        currentStatus={getRecord(progress, question.id)?.status}
        key={question.id}
        onMark={(status) => updateQuestion(question.id, status)}
        question={question}
      />
      <div className="flex justify-between gap-3">
        <button
          className="rounded-full bg-white px-5 py-3 font-bold text-ink shadow-panel disabled:opacity-40 focus-ring"
          disabled={index === 0}
          onClick={() => setIndex((value) => value - 1)}
          type="button"
        >
          Previous
        </button>
        {index === displayQuestions.length - 1 ? (
          // A card marked in a prior session is already counted as completed,
          // so cross-session records satisfy the gate intentionally.
          (getRecord(progress, question.id)?.status ?? "new") !== "new" ? (
            <Link
              className="rounded-full bg-signal px-5 py-3 font-bold text-black shadow-panel transition hover:bg-[#b93e1f] focus-ring"
              href={`/topics/${topic.id}`}
            >
              Finish
            </Link>
          ) : (
            <div className="flex flex-col items-end gap-1">
              <button
                className="rounded-full bg-signal px-5 py-3 font-bold text-black shadow-panel disabled:opacity-40 focus-ring"
                disabled
                type="button"
              >
                Finish
              </button>
              <p aria-live="polite" className="text-xs font-semibold text-ink/50">
                Mark this card to finish
              </p>
            </div>
          )
        ) : (
          <button
            className="rounded-full bg-ink px-5 py-3 font-bold text-paper shadow-panel focus-ring"
            onClick={() => setIndex((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
