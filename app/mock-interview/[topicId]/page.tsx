"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { StatusButtons } from "@/components/StatusButtons";
import { getInterviewQuestions, getTopic } from "@/lib/questionUtils";
import { getRecord, useProgress } from "@/lib/progress";
import type { QuestionStatus } from "@/types/Progress";

const checklist = [
  "Did I answer directly?",
  "Did I mention tools?",
  "Did I give a real example?",
  "Did I explain tradeoffs?",
  "Did I avoid rambling?"
];

export default function MockInterviewPage() {
  const params = useParams<{ topicId: string }>();
  const topic = getTopic(params.topicId);
  const questions = getInterviewQuestions(params.topicId);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const { progress, updateQuestion } = useProgress();
  const question = questions[index];

  if (!topic || !question) {
    return <p className="rounded-2xl bg-white/80 p-6">No mock interview questions found for this topic.</p>;
  }

  function rate(status: QuestionStatus) {
    updateQuestion(question.id, status);
  }

  function nextQuestion() {
    setIndex((current) => Math.min(current + 1, questions.length - 1));
    setAnswer("");
    setShowModelAnswer(false);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-signal" href={`/topics/${topic.id}`}>Back to topic</Link>
          <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{topic.title} Mock Interview</h1>
        </div>
        <p className="font-bold text-ink/60">Prompt {index + 1} of {questions.length}</p>
      </header>
      <QuestionCard question={question}>
        <label className="block">
          <span className="font-bold">Your answer</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-ink/10 bg-paper/70 p-4 leading-7 outline-none focus:border-signal sm:min-h-40"
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write your answer as if you are speaking to an interviewer..."
            value={answer}
          />
        </label>
        <button className="mt-4 rounded-full bg-signal px-5 py-3 text-sm font-bold text-white focus-ring" onClick={() => setShowModelAnswer((value) => !value)} type="button">
          {showModelAnswer ? "Hide model answer" : "Reveal model answer"}
        </button>
        {showModelAnswer ? (
          <div className="mt-6 space-y-5">
            <section className="rounded-2xl bg-paper/80 p-4">
              <h2 className="font-bold">Model answer</h2>
              <p className="mt-2 leading-7 text-ink/75">{question.interviewAnswer ?? question.shortAnswer}</p>
            </section>
            {question.realProjectExample ? (
              <section>
                <h2 className="font-bold">Real project example</h2>
                <p className="mt-2 leading-7 text-ink/75">{question.realProjectExample}</p>
              </section>
            ) : null}
            <section>
              <h2 className="font-bold">Self-review checklist</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {checklist.map((item) => (
                  <label className="rounded-2xl bg-white/80 p-3" key={item}>
                    <input className="mr-2" type="checkbox" />
                    {item}
                  </label>
                ))}
              </div>
            </section>
            <section>
              <h2 className="mb-3 font-bold">Self-rating</h2>
              <StatusButtons currentStatus={getRecord(progress, question.id)?.status} onMark={rate} />
            </section>
          </div>
        ) : null}
      </QuestionCard>
      <button className="rounded-full bg-ink px-5 py-3 font-bold text-paper disabled:opacity-40 focus-ring" disabled={index === questions.length - 1} onClick={nextQuestion} type="button">
        Next prompt
      </button>
    </div>
  );
}
