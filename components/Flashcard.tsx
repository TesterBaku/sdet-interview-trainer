"use client";

import { useState } from "react";
import { QuestionCard } from "@/components/QuestionCard";
import { StatusButtons } from "@/components/StatusButtons";
import type { Question } from "@/types/Question";
import type { QuestionStatus } from "@/types/Progress";

type FlashcardProps = {
  question: Question;
  currentStatus?: QuestionStatus;
  onMark: (status: QuestionStatus) => void;
};

export function Flashcard({ question, currentStatus, onMark }: FlashcardProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const hasInterviewAnswer = question.shortAnswer || question.interviewAnswer || question.realProjectExample;
  const hasQuizAnswer = question.correctAnswer || question.explanation;
  const hasCodingAnswer = question.solution || question.hint || question.expectedOutput;

  return (
    <QuestionCard question={question}>
      <button
        className="rounded-full bg-signal px-5 py-3 text-sm font-bold text-black transition hover:bg-[#b93e1f] focus-ring"
        onClick={() => setIsRevealed((current) => !current)}
        type="button"
      >
        {isRevealed ? "Hide answer" : "Reveal answer"}
      </button>

      {isRevealed ? (
        <div className="mt-6 space-y-5">
          {hasCodingAnswer ? (
            <section className="space-y-4">
              {question.hint ? (
                <div className="rounded-2xl bg-brass/10 p-4">
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Hint</h2>
                  <p className="mt-2 break-words text-ink/80">{question.hint}</p>
                </div>
              ) : null}
              {question.expectedOutput ? (
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Expected output</h2>
                  <pre className="mt-2 whitespace-pre-wrap rounded-2xl bg-paper/80 p-4 text-sm text-ink">
                    {question.expectedOutput}
                  </pre>
                </div>
              ) : null}
              {question.solution ? (
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">
                    Solution{question.solutionLanguage ? ` (${question.solutionLanguage})` : ""}
                  </h2>
                  <pre className="mt-2 overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-paper">
                    {question.solution}
                  </pre>
                </div>
              ) : null}
              {question.explanation ? (
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Explanation</h2>
                  <p className="mt-2 break-words leading-7 text-ink/80">{question.explanation}</p>
                </div>
              ) : null}
              {question.commonMistakes?.length ? (
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Common mistakes</h2>
                  <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-ink/80">
                    {question.commonMistakes.map((mistake) => (
                      <li key={mistake}>{mistake}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
          {hasQuizAnswer ? (
            <section className="rounded-2xl bg-paper/80 p-4">
              {question.correctAnswer ? (
                <>
                  <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Correct answer</h2>
                  <p className="mt-2 break-words text-lg font-bold text-blueprint">{question.correctAnswer}</p>
                </>
              ) : null}
              {question.explanation ? <p className="mt-3 break-words leading-7 text-ink/80">{question.explanation}</p> : null}
            </section>
          ) : null}
          {question.shortAnswer ? (
            <section>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Short answer</h2>
              <p className="mt-2 break-words text-ink/80">{question.shortAnswer}</p>
            </section>
          ) : null}
          {question.interviewAnswer ? (
            <section>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Interview answer</h2>
              <p className="mt-2 break-words leading-7 text-ink/80">{question.interviewAnswer}</p>
            </section>
          ) : null}
          {question.realProjectExample ? (
            <section className="rounded-2xl bg-paper/80 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Real project example</h2>
              <p className="mt-2 break-words leading-7 text-ink/80">{question.realProjectExample}</p>
            </section>
          ) : null}
          {!hasInterviewAnswer && !hasQuizAnswer && !hasCodingAnswer ? (
            <section className="rounded-2xl bg-paper/80 p-4">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Answer</h2>
              <p className="mt-2 break-words text-ink/80">No answer content has been added for this card yet.</p>
            </section>
          ) : null}
          {question.followUps?.length ? (
            <section>
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Follow-ups</h2>
              <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-ink/80">
                {question.followUps.map((followUp) => (
                  <li key={followUp}>{followUp}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <StatusButtons currentStatus={currentStatus} onMark={onMark} />
        </div>
      ) : null}
    </QuestionCard>
  );
}
