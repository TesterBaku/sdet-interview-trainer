"use client";

import { TopicCard } from "@/components/TopicCard";
import { topics } from "@/lib/questionUtils";
import { summarizeTopicProgress, useProgress } from "@/lib/progress";

export default function TopicsPage() {
  const { progress } = useProgress();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Topics</p>
        <h1 className="mt-2 font-display text-3xl font-black text-blueprint sm:text-5xl">Choose a training lane</h1>
      </header>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {topics.map((topic) => (
          <TopicCard key={topic.id} progressPercent={summarizeTopicProgress(progress, topic.id).percentComplete} topic={topic} />
        ))}
      </div>
    </div>
  );
}
