"use client";

import { useState, useSyncExternalStore } from "react";
import { StatusButtons } from "@/components/StatusButtons";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { clearCodeDraft, readCodeDraft, subscribeToCodeDraft, writeCodeDraft } from "@/lib/codeWorkspace";
import type { CodeRunResponse } from "@/lib/coding/contracts";
import { runPythonVisibleTests, type PythonRunResult } from "@/lib/pythonRunner";
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
  const [runResult, setRunResult] = useState<PythonRunResult>();
  const [isRunning, setIsRunning] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [serverResult, setServerResult] = useState<CodeRunResponse>();
  const [serverError, setServerError] = useState<string>();
  const [isServerRunning, setIsServerRunning] = useState(false);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
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
    setRunResult(undefined);
  }

  async function runVisibleTests() {
    if (!question.runner || !draft.trim()) {
      return;
    }

    setIsRunning(true);
    setRunResult(undefined);
    try {
      setRunResult(await runPythonVisibleTests(draft, question.runner));
    } catch {
      setRunResult({ status: "error", error: "The Python runner could not start. Please try again.", tests: [] });
    } finally {
      setIsRunning(false);
    }
  }

  async function runServerTests() {
    if (!question.runner || !draft.trim() || !turnstileToken) return;
    setIsServerRunning(true);
    setServerResult(undefined);
    setServerError(undefined);
    try {
      const response = await fetch("/api/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, language: question.runner.language, source: draft, turnstileToken }) });
      const payload = (await response.json()) as CodeRunResponse | { error?: string };
      if (!response.ok || !("status" in payload)) throw new Error("error" in payload ? payload.error : "The server runner could not complete.");
      setServerResult(payload);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "The server runner could not complete.");
    } finally {
      setIsServerRunning(false);
      setTurnstileToken("");
      setTurnstileResetKey((value) => value + 1);
    }
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
        {question.runner ? (
          <div className="mt-4 border-t border-paper/10 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-paper/70">Runs {question.runner.visibleTests.length} visible Python tests in your browser.</p>
              <button
                className="rounded-full bg-brass px-4 py-2 text-sm font-bold text-black transition hover:bg-[#e5ad4c] disabled:cursor-not-allowed disabled:opacity-45 focus-ring"
                disabled={!draft.trim() || isRunning}
                onClick={runVisibleTests}
                type="button"
              >
                {isRunning ? "Running visible tests…" : `Run ${question.runner.visibleTests.length} visible tests`}
              </button>
            </div>
            <p className="mt-2 text-xs text-paper/55">Visible tests only — this free browser runner does not use hidden grading.</p>
            <div aria-live="polite" className="mt-3">
              {runResult?.status === "error" ? <p className="rounded-xl bg-red-950/70 p-3 text-sm text-red-100">{runResult.error}</p> : null}
              {runResult?.status === "completed" ? (
                <div className="space-y-2 rounded-xl bg-paper/10 p-3 text-sm">
                  <p className="font-bold text-paper">
                    {runResult.tests.filter((test) => test.passed).length}/{runResult.tests.length} visible tests passed
                  </p>
                  <ul className="space-y-1 text-paper/80">
                    {runResult.tests.map((test) => (
                      <li key={test.name}>
                        <span className={test.passed ? "text-emerald-300" : "text-red-300"}>{test.passed ? "Passed" : "Failed"}</span>: {test.name}
                        {!test.passed && test.error ? ` — ${test.error}` : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="mt-5 border-t border-paper/10 pt-4">
              <p className="text-sm text-paper/70">Verify before running private server checks.</p>
              <div className="mt-3"><TurnstileWidget action="code_run" onToken={setTurnstileToken} resetKey={turnstileResetKey} /></div>
              <button className="mt-3 rounded-full border border-brass px-4 py-2 text-sm font-bold text-brass disabled:cursor-not-allowed disabled:opacity-45 focus-ring" disabled={!draft.trim() || !turnstileToken || isServerRunning} onClick={runServerTests} type="button">
                {isServerRunning ? "Running server checksâ€¦" : "Run private server check"}
              </button>
              <div aria-live="polite" className="mt-3">
                {serverError ? <p className="rounded-xl bg-red-950/70 p-3 text-sm text-red-100">{serverError}</p> : null}
                {serverResult ? <p className="rounded-xl bg-paper/10 p-3 text-sm text-paper">{serverResult.visible.passed}/{serverResult.visible.total} visible and {serverResult.hidden.passed}/{serverResult.hidden.total} private checks passed.</p> : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {showHint ? <p className="mt-4 break-words rounded-2xl bg-brass/10 p-4 text-ink/80">{question.hint}</p> : null}
      {showSolution ? (
        <div className="mt-4 space-y-4">
          <pre className="max-w-full overflow-x-auto rounded-2xl bg-ink p-4 text-sm text-paper">{question.solution}</pre>
          <p className="break-words leading-7 text-ink/75">{question.explanation}</p>
          {question.commonMistakes?.length ? (
            <div>
              <h3 className="font-bold">Common mistakes</h3>
              <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-ink/75">
                {question.commonMistakes.map((mistake) => (
                  <li key={mistake}>{mistake}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {question.followUps?.length ? (
            <div>
              <h3 className="font-bold">Follow-ups</h3>
              <ul className="mt-2 list-disc space-y-1 break-words pl-5 text-ink/75">
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
