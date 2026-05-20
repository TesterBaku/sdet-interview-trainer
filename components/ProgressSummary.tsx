import type { ProgressSummary as ProgressSummaryType } from "@/types/Progress";

type ProgressSummaryProps = {
  summary: ProgressSummaryType;
  title?: string;
};

export function ProgressSummary({ summary, title = "Progress Summary" }: ProgressSummaryProps) {
  return (
    <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-blueprint">{title}</h2>
        <span className="rounded-full bg-brass/15 px-3 py-1 text-sm font-bold text-blueprint">
          {summary.percentComplete}%
        </span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-signal" style={{ width: `${summary.percentComplete}%` }} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Total", summary.totalQuestions],
          ["Completed", summary.completedQuestions],
          ["Known", summary.knownQuestions],
          ["Review", summary.reviewQuestions],
          ["Weak", summary.weakQuestions]
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-paper/80 p-3" key={label}>
            <dt className="text-xs uppercase tracking-[0.18em] text-ink/55">{label}</dt>
            <dd className="mt-1 text-2xl font-black text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
