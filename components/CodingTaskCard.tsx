"use client";

import { useState, useSyncExternalStore } from "react";
import { StatusButtons } from "@/components/StatusButtons";
import { clearCodeDraft, readCodeDraft, subscribeToCodeDraft, writeCodeDraft } from "@/lib/codeWorkspace";
import type { Question } from "@/types/Question";
import type { QuestionStatus } from "@/types/Progress";

type CodingTaskCardProps = {
  question: Question;
  currentStatus?: QuestionStatus;
  onMark: (status: QuestionStatus) => void;
};

export function CodingTaskCard({ question, currentStatus, onMark }: CodingTaskCardProps) {
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const textareaId = `code-answer-${question.id}`;
  const draft = useSyncExternalStore(
    (onStoreChange) => subscribeToCodeDraft(question.id, onStoreChange),
    () => readCodeDraft(question.id),
    () => ""
  );

  function updateDraft(nextDraft: string) {
    writeCodeDraft(question.id, nextDraft);
  }

  function resetDraft() {
    clearCodeDraft(question.id);
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-[2rem] border border-ink/10 bg-white/80 p-4 shadow-panel sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-blueprint px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-paper">
          {question.topicTitle}
        </span>
        <span className="rounded-full bg-brass/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blueprint">
          {question.solutionLanguage}
        </span>
      </div>
      <h2 className="mt-4 break-words font-display text-2xl font-bold text-blueprint">{question.title}</h2>
      <p className="mt-3 break-words leading-7 text-ink/75">{question.problem}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-paper/80 p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Input</h3>
          <pre className="mt-2 whitespace-pre-wrap break-all text-sm">{question.inputExample}</pre>
        </div>
        <div className="rounded-2xl bg-paper/80 p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-ink/55">Expected output</h3>
          <pre className="mt-2 whitespace-pre-wrap break-all text-sm">{question.expectedOutput}</pre>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className="rounded-full bg-brass px-4 py-2 text-sm font-bold text-black focus-ring" onClick={() => setShowHint((value) => !value)} type="button">
          {showHint ? "Hide hint" : "Reveal hint"}
        </button>
        <button className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-paper focus-ring" onClick={() => setShowSolution((value) => !value)} type="button">
          {showSolution ? "Hide solution" : "Reveal solution"}
        </button>
      </div>

      <section className="mt-5 rounded-[1.5rem] border border-ink/10 bg-[#121820] p-4 text-paper">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-2xl font-bold">Answer sandbox</h3>
            <p className="mt-1 text-sm text-paper/65">
              Write your solution here. Drafts auto-save locally; code is not executed in the MVP.
            </p>
          </div>
          <button
            className="self-start rounded-full border border-paper/20 px-4 py-2 text-sm font-bold text-paper/85 transition hover:bg-paper/10 disabled:cursor-not-allowed disabled:opacity-45 focus-ring"
            disabled={!draft}
            onClick={resetDraft}
            type="button"
          >
            Clear draft
          </button>
        </div>
        <label className="mt-4 block text-sm font-bold text-paper/80" htmlFor={textareaId}>
          Your answer
        </label>
        <textarea
          className="mt-2 min-h-48 w-full resize-y rounded-2xl border border-paper/10 bg-[#0b1118] p-4 font-mono text-sm leading-6 text-[#f3e8d2] outline-none placeholder:text-paper/35 focus:border-brass sm:min-h-72"
          id={textareaId}
          name={textareaId}
          onChange={(event) => updateDraft(event.target.value)}
          placeholder={`Write your ${question.solutionLanguage ?? "code"} answer here...`}
          spellCheck={false}
          value={draft}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-[0.16em] text-paper/70">
          <span>{draft.length} chars</span>
          <span>Saved in this browser</span>
        </div>
      </section>

      {showHint ? <p className="mt-4 break-words rounded-2xl bg-brass/10 p-4 text-ink/80">{question.hint}</p> : null}
      {showSolution ? (
        <div className="mt-4 space-y-4">
          <pre className="max-w-full overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-paper">{question.solution}</pre>
          <p className="break-words leading-7 text-ink/75">{question.explanation}</p>
          {question.commonMistakes?.length ? (
            <div>
              <h3 className="font-bold">Common mistakes</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/75">
                {question.commonMistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {question.followUps?.length ? (
            <div>
              <h3 className="font-bold">Follow-ups</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/75">
                {question.followUps.map((followUp) => (
                  <li key={followUp}>{followUp}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <StatusButtons currentStatus={currentStatus} onMark={onMark} />
        </div>
      ) : null}
    </article>
  );
}
