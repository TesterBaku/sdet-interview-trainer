import Link from "next/link";
import type { Topic } from "@/types/Topic";

type TopicCardProps = {
  topic: Topic;
  progressPercent: number;
};

export function TopicCard({ topic, progressPercent }: TopicCardProps) {
  return (
    <article className="group flex h-full flex-col rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel transition hover:-translate-y-1 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-full bg-blueprint/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-blueprint">
          {topic.category}
        </span>
        <span className="text-sm font-bold text-ink/60">{topic.questionCount} questions</span>
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold text-blueprint">{topic.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-ink/70">{topic.description}</p>
      <div className="mt-5">
        <div className="flex justify-between text-sm font-semibold">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10">
          <div className="h-full rounded-full bg-signal" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <Link
        className="mt-5 inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-blueprint focus-ring"
        href={`/topics/${topic.id}`}
      >
        Start practice
      </Link>
    </article>
  );
}
