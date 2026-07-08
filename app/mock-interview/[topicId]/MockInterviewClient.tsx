"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { StatusButtons } from "@/components/StatusButtons";
import { getInterviewQuestions, getTopic } from "@/lib/questionUtils";
import { useShuffledList } from "@/lib/useShuffledList";
import { getRecord, useProgress } from "@/lib/progress";
import type { QuestionStatus } from "@/types/Progress";

const checklist = [
  "Did I answer directly?",
  "Did I mention tools?",
  "Did I give a real example?",
  "Did I explain tradeoffs?",
  "Did I avoid rambling?"
];

const answerStructure = [
  "Direct answer",
  "Tool or technique",
  "Real project example",
  "Tradeoff or limitation"
];

export function MockInterviewClient() {
  const params = useParams<{ topicId: string }>();
  const searchParams = useSearchParams();
  const topic = getTopic(params.topicId);
  const questions = useMemo(() => getInterviewQuestions(params.topicId), [params.topicId]);
  const { list: displayQuestions, shuffled, toggle } = useShuffledList(questions);
  const [index, setIndex] = useState(() => {
    const requestedQuestionId = searchParams.get("question");
    const requestedIndex = requestedQuestionId
      ? questions.findIndex((question) => question.id === requestedQuestionId)
      : -1;
    return requestedIndex >= 0 ? requestedIndex : 0;
  });
  const [answer, setAnswer] = useState("");
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const { progress, updateQuestion } = useProgress();
  const question = displayQuestions[index];
  const textareaId = question ? `mock-answer-${question.id}` : "mock-answer";

  if (!topic || !question) {
    return <p className="rounded-2xl bg-white/80 p-6">No mock interview questions found for this topic.</p>;
  }

  function rate(status: QuestionStatus) {
    updateQuestion(question.id, status);
  }

  function nextQuestion() {
    setIndex((current) => Math.min(current + 1, displayQuestions.length - 1));
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
        <div className="flex items-center gap-3">
          <button
            className={`rounded-full border px-4 py-2 text-sm font-bold shadow-panel focus-ring transition ${shuffled ? "border-signal/40 bg-signal/10 text-signal" : "border-ink/15 bg-white/80 text-ink"}`}
            onClick={() => toggle(() => { setIndex(0); setAnswer(""); setShowModelAnswer(false); })}
            type="button"
          >
            {shuffled ? "Reset order" : "Shuffle"}
          </button>
          <p className="font-bold text-ink/60">Prompt {index + 1} of {displayQuestions.length}</p>
        </div>
      </header>
      <QuestionCard question={question}>
        <aside className="rounded-2xl border border-brass/30 bg-brass/10 p-4">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brass">Answer guide</p>
          <p className="mt-2 font-bold text-blueprint">Try to answer in 60–90 seconds.</p>
          <p className="mt-2 text-sm text-ink/70">Use this structure:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink/80">
            {answerStructure.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </aside>
        <label className="mt-4 block" htmlFor={textareaId}>
          <span className="font-bold">Your answer</span>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-ink/10 bg-paper/70 p-4 leading-7 outline-none focus:border-signal sm:min-h-40"
            id={textareaId}
            name={textareaId}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write your answer as if you are speaking to an interviewer..."
            value={answer}
          />
        </label>
        <button className="mt-4 rounded-full bg-signal px-5 py-3 text-sm font-bold text-black focus-ring" onClick={() => setShowModelAnswer((value) => !value)} type="button">
          {showModelAnswer ? "Hide model answer" : "Reveal model answer"}
        </button>
        {showModelAnswer ? (
          <div className="mt-6 space-y-5">
            <section className="rounded-2xl bg-paper/80 p-4">
              <h2 className="font-bold">Model answer</h2>
              <p className="mt-2 break-words leading-7 text-ink/75">{question.interviewAnswer ?? question.shortAnswer}</p>
            </section>
            {question.realProjectExample ? (
              <section>
                <h2 className="font-bold">Real project example</h2>
                <p className="mt-2 break-words leading-7 text-ink/75">{question.realProjectExample}</p>
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
      {index === displayQuestions.length - 1 ? (
        <Link className="inline-block rounded-full bg-ink px-5 py-3 font-bold text-paper focus-ring" href={`/topics/${topic.id}`}>
          Back to topic
        </Link>
      ) : (
        <button className="rounded-full bg-ink px-5 py-3 font-bold text-paper focus-ring" onClick={nextQuestion} type="button">
          Next prompt
        </button>
      )}
    </div>
  );
}
