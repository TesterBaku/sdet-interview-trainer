import type { Question } from "@/types/Question";

type QuestionCardProps = {
  question: Question;
  children?: React.ReactNode;
};

export function QuestionCard({ question, children }: QuestionCardProps) {
  return (
    <article className="min-w-0 rounded-[2rem] border border-ink/10 bg-white/80 p-6 shadow-panel">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-blueprint px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-paper">
          {question.type}
        </span>
        <span className="rounded-full bg-brass/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blueprint">
          {question.difficulty}
        </span>
      </div>
      {/* break-words lets long single-word tokens (e.g. "StaleElementReferenceException")
          wrap instead of overflowing on mobile. */}
      <h1 className="mt-5 break-words font-display text-2xl font-black text-blueprint sm:text-3xl">{question.title ?? question.question}</h1>
      {question.title ? <p className="mt-3 break-words text-lg text-ink/80">{question.question}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </article>
  );
}
