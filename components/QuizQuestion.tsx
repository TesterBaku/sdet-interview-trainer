"use client";

import { useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import type { Question } from "@/types/Question";

type QuizQuestionProps = {
  question: Question;
  isFinalQuestion: boolean;
  onComplete: (isCorrect: boolean) => void;
};

export function QuizQuestion({ question, isFinalQuestion, onComplete }: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const isCorrect = selectedAnswer === question.correctAnswer;

  return (
    <QuestionCard question={question}>
      <div className="grid gap-3">
        {question.choices?.map((choice) => (
          <label
            className={`cursor-pointer rounded-2xl border p-4 transition ${
              selectedAnswer === choice ? "border-signal bg-signal/10" : "border-ink/10 bg-white/70 hover:bg-white"
            }`}
            key={choice}
          >
            <input
              checked={selectedAnswer === choice}
              className="mr-3"
              disabled={isSubmitted}
              name={question.id}
              onChange={() => setSelectedAnswer(choice)}
              type="radio"
            />
            {choice}
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-blueprint disabled:cursor-not-allowed disabled:opacity-45 focus-ring"
          disabled={!selectedAnswer || isSubmitted}
          onClick={() => setIsSubmitted(true)}
          type="button"
        >
          Submit answer
        </button>
        {isSubmitted ? (
          <button
            className="rounded-full bg-signal px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b93e1f] disabled:cursor-not-allowed disabled:opacity-45 focus-ring"
            disabled={isSaved}
            onClick={() => {
              setIsSaved(true);
              onComplete(isCorrect);
            }}
            type="button"
          >
            {isSaved ? "Saved" : isFinalQuestion ? "Save and finish" : "Save and continue"}
          </button>
        ) : null}
      </div>

      {isSubmitted ? (
        <section className={`mt-5 rounded-2xl p-4 ${isCorrect ? "bg-emerald-50" : "bg-red-50"}`}>
          <h2 className="font-bold">{isCorrect ? "Correct" : `Incorrect. Correct answer: ${question.correctAnswer}`}</h2>
          <p className="mt-2 leading-7 text-ink/75">{question.explanation}</p>
        </section>
      ) : null}
    </QuestionCard>
  );
}
