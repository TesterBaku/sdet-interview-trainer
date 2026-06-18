import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Practice | SDET Interview Trainer",
  description:
    "Choose how to practice: a daily plan, topic-by-topic drilling, or focused quizzes — all in one place.",
  openGraph: { url: "/practice" },
};

const lanes = [
  {
    href: "/daily-practice",
    eyebrow: "Start here",
    title: "Daily Practice",
    body: "A ready-made 10-item plan mixing coding, SQL, automation, and strategy. The fastest way to make progress without choosing.",
    className: "border-brass/40 bg-brass/15",
    eyebrowClass: "text-brass",
  },
  {
    href: "/topics",
    eyebrow: "Go deep",
    title: "Topics",
    body: "Drill one area at a time — flashcards, quiz, and mock interview for each of the 10 topics.",
    className: "border-blueprint/20 bg-blueprint/10",
    eyebrowClass: "text-blueprint/70",
  },
  {
    href: "/quizzes",
    eyebrow: "Check yourself",
    title: "Quizzes",
    body: "Multiple-choice questions from every cheat sheet, with instant feedback and explanations.",
    className: "border-signal/30 bg-signal/10",
    eyebrowClass: "text-signal",
  },
];

export default function PracticePage() {
  return (
    <div className="space-y-6">
      <header className="rounded-[2.5rem] border border-ink/10 bg-white/75 p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Practice</p>
        <h1 className="mt-3 font-display text-3xl font-black text-blueprint sm:text-5xl">Pick how you want to practice</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          Three ways into the same question bank. Not sure where to start? Take the daily plan.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {lanes.map((lane) => (
          <Link
            key={lane.href}
            href={lane.href}
            className={`flex flex-col rounded-[2rem] border p-6 shadow-panel transition hover:-translate-y-1 ${lane.className}`}
          >
            <p className={`text-sm font-bold uppercase tracking-[0.2em] ${lane.eyebrowClass}`}>{lane.eyebrow}</p>
            <h2 className="mt-3 font-display text-2xl font-bold text-blueprint">{lane.title}</h2>
            <p className="mt-2 text-ink/75">{lane.body}</p>
            <span className="mt-4 font-bold text-signal">Open {lane.title} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
