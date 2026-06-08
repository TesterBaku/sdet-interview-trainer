import type { Metadata } from "next";
import Link from "next/link";
import { mockExams } from "@/lib/mockExams";

export const metadata: Metadata = {
  title: "Mock Exams | SDET Interview Trainer",
  description: "Full mock certification exams with domain breakdowns and pass/fail scoring.",
  openGraph: { url: "/mock-exam" },
};

export default function MockExamsPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Mock Exam</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">Sit a full mock exam</h1>
        <p className="mt-4 text-lg leading-8 text-ink/75">
          Exam-style practice: answer every question, get a score with a pass/fail verdict and a per-domain breakdown.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2">
        {mockExams.map((exam) => (
          <Link
            className="group flex h-full flex-col rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-panel transition hover:-translate-y-1 hover:bg-white"
            href={`/mock-exam/${exam.id}`}
            key={exam.id}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full bg-blueprint/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blueprint">
                Certification
              </span>
              <span className="text-sm font-bold text-ink/60">{exam.questions.length} questions</span>
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold text-blueprint">{exam.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-ink/70">{exam.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {exam.domains.map((domain) => (
                <span className="rounded-md bg-paper/80 px-2 py-1 text-[11px] font-semibold text-ink/60" key={domain.id}>
                  {domain.label} {domain.weight}
                </span>
              ))}
            </div>
            <span className="mt-5 text-sm font-bold text-signal">Start mock exam →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
