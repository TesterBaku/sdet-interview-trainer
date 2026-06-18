"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getMockExam } from "@/lib/mockExams";

const DOMAIN_COLORS: Record<number, string> = {
  1: "#c2410c",
  2: "#1d4ed8",
  3: "#15803d",
  4: "#7c3aed",
  5: "#b45309",
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function MockExamClient() {
  const params = useParams<{ examId: string }>();
  const exam = useMemo(() => getMockExam(params.examId), [params.examId]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [activeDomain, setActiveDomain] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Per-domain counts/labels are static for an exam — compute once, not per render inside maps.
  const domainMeta = useMemo(() => {
    const counts = new Map<number, number>();
    const labels = new Map<number, string>();
    for (const q of exam?.questions ?? []) counts.set(q.domain, (counts.get(q.domain) ?? 0) + 1);
    for (const d of exam?.domains ?? []) labels.set(d.id, d.label);
    return { counts, labels };
  }, [exam]);

  if (!exam) {
    return <p className="rounded-2xl bg-white/80 p-6">Mock exam not found.</p>;
  }

  const total = exam.questions.length;
  const answeredCount = Object.keys(answers).length;
  const correctCount = exam.questions.filter((q) => answers[q.id] === q.correct).length;
  const visible = activeDomain === 0 ? exam.questions : exam.questions.filter((q) => q.domain === activeDomain);

  function choose(questionId: number, optionIndex: number) {
    setAnswers((current) => (current[questionId] !== undefined ? current : { ...current, [questionId]: optionIndex }));
  }

  function restart() {
    setAnswers({});
    setActiveDomain(0);
    setSubmitted(false);
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  if (submitted) {
    const pct = total ? Math.round((correctCount / total) * 100) : 0;
    const passed = pct >= exam.passThreshold;
    return (
      <div className="space-y-6">
        <header>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Results</p>
          <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{exam.title}</h1>
        </header>
        <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-8 text-center shadow-panel">
          <p className={`font-display text-7xl font-black ${passed ? "text-emerald-600" : "text-signal"}`}>{pct}%</p>
          <p className={`mt-2 text-lg font-bold ${passed ? "text-emerald-700" : "text-signal"}`}>
            {passed ? "Pass" : "Below pass"} — {correctCount} / {total} correct (pass mark {exam.passThreshold}%)
          </p>
          <p className="mt-2 text-ink/70">
            {passed
              ? "Strong performance. Keep drilling your weaker domains below."
              : "Review the explanations for the questions you missed and revisit the cheat sheet."}
          </p>
        </section>

        <section className="rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-panel">
          <h2 className="font-display text-2xl font-bold text-blueprint">Score by domain</h2>
          <div className="mt-4 space-y-4">
            {exam.domains.map((domain) => {
              const dq = exam.questions.filter((q) => q.domain === domain.id);
              const dCorrect = dq.filter((q) => answers[q.id] === q.correct).length;
              const dPct = dq.length ? Math.round((dCorrect / dq.length) * 100) : 0;
              const color = DOMAIN_COLORS[domain.id];
              return (
                <div key={domain.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-bold" style={{ color }}>
                      D{domain.id}: {domain.label}
                    </span>
                    <span className="font-semibold text-ink/70">
                      {dCorrect}/{dq.length} ({dPct}%) · weight {domain.weight}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full" style={{ width: `${dPct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <button
          className="rounded-full bg-ink px-6 py-3 font-bold text-paper transition hover:bg-blueprint focus-ring"
          onClick={restart}
          type="button"
        >
          Restart exam
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Mock Exam</p>
          <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">{exam.title}</h1>
        </div>
        <div className="rounded-2xl border border-ink/10 bg-white/80 px-5 py-3 text-center shadow-panel">
          <p className="font-display text-2xl font-black text-blueprint">
            {correctCount}/{answeredCount}
          </p>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/55">Correct / Answered</p>
        </div>
      </header>

      <div>
        <div className="flex justify-between text-sm font-semibold text-ink/70">
          <span>Progress</span>
          <span>
            {answeredCount} of {total} answered
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-signal" style={{ width: `${total ? Math.round((answeredCount / total) * 100) : 0}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full border px-4 py-2 text-sm font-bold transition focus-ring ${activeDomain === 0 ? "border-signal/40 bg-signal/10 text-signal" : "border-ink/15 bg-white/80 text-ink hover:bg-white"}`}
          onClick={() => setActiveDomain(0)}
          type="button"
        >
          All ({total})
        </button>
        {exam.domains.map((domain) => {
          const count = domainMeta.counts.get(domain.id) ?? 0;
          const active = activeDomain === domain.id;
          return (
            <button
              className={`rounded-full border px-4 py-2 text-sm font-bold transition focus-ring ${active ? "bg-white" : "border-ink/15 bg-white/80 text-ink hover:bg-white"}`}
              key={domain.id}
              onClick={() => setActiveDomain(domain.id)}
              style={active ? { borderColor: DOMAIN_COLORS[domain.id], color: DOMAIN_COLORS[domain.id] } : undefined}
              type="button"
            >
              D{domain.id}: {domain.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {visible.map((q) => {
          const chosen = answers[q.id];
          const isAnswered = chosen !== undefined;
          const isCorrect = chosen === q.correct;
          const color = DOMAIN_COLORS[q.domain];
          const domainLabel = domainMeta.labels.get(q.domain) ?? `Domain ${q.domain}`;
          return (
            <article
              className={`rounded-[1.5rem] border bg-white/80 p-5 shadow-panel sm:p-6 ${isAnswered ? (isCorrect ? "border-emerald-400" : "border-signal/60") : "border-ink/10"}`}
              key={q.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink/50">Q{q.id}</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: `${color}1a`, color }}
                >
                  D{q.domain}: {domainLabel}
                </span>
              </div>
              <p className="mt-3 font-bold text-blueprint">{q.text}</p>
              <div className="mt-4 grid gap-2">
                {q.options.map((opt, i) => {
                  const base = "flex items-start gap-3 rounded-xl border p-3 text-left text-sm transition";
                  let cls = `${base} border-ink/10 bg-white/70`;
                  if (isAnswered) {
                    if (i === q.correct) cls = `${base} border-emerald-400 bg-emerald-50`;
                    else if (i === chosen) cls = `${base} border-signal/60 bg-red-50`;
                    else cls = `${base} border-ink/10 bg-white/50 opacity-70`;
                  } else {
                    cls += " hover:bg-white focus-ring cursor-pointer";
                  }
                  return (
                    <button
                      aria-pressed={chosen === i}
                      className={cls}
                      disabled={isAnswered}
                      key={i}
                      onClick={() => choose(q.id, i)}
                      type="button"
                    >
                      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-ink/10 text-xs font-bold text-ink/70">
                        {LETTERS[i]}
                      </span>
                      <span className="pt-0.5">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {isAnswered ? (
                <div
                  className={`mt-4 rounded-xl border-l-4 p-4 text-sm leading-7 ${isCorrect ? "border-emerald-400 bg-emerald-50" : "border-signal/60 bg-red-50"}`}
                >
                  <p className="mb-1 font-bold">
                    {isCorrect ? "✓ Correct" : `✗ Incorrect — correct answer: ${LETTERS[q.correct]}`}
                  </p>
                  <span className="exam-rich" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <button
        className="w-full rounded-full bg-signal px-6 py-4 font-bold text-black transition hover:bg-[#b93e1f] focus-ring"
        onClick={() => {
          setSubmitted(true);
          if (typeof window !== "undefined") window.scrollTo(0, 0);
        }}
        type="button"
      >
        Submit &amp; see final score
      </button>
    </div>
  );
}
