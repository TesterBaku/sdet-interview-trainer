"use client";

import Link from "next/link";
import { ProgressSummary } from "@/components/ProgressSummary";
import { getQuestionsByTopic, getWeakTopicIds, topics } from "@/lib/questionUtils";
import { summarizeProgress, summarizeTopicProgress, useProgress } from "@/lib/progress";

export default function HomePage() {
  const { progress } = useProgress();
  const summary = summarizeProgress(progress);
  const weakTopicIds = getWeakTopicIds(progress.records);
  const nextTopic =
    topics.find((topic) => summarizeTopicProgress(progress, topic.id).percentComplete < 100) ?? topics[0];

  return (
    <div className="space-y-8">
      <section className="blueprint-grid overflow-hidden rounded-[2.5rem] border border-ink/10 bg-white/70 p-6 shadow-panel sm:p-10">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">QA Automation / SDET prep</p>
          <h1 className="mt-4 font-display text-5xl font-black leading-tight text-blueprint sm:text-7xl">
            Practice like the interview is already scheduled.
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink/75">
            Flashcards, quizzes, mock interviews, and coding tasks for Python, Java, SQL, Playwright, Selenium, API
            testing, CI/CD, AWS, and automation strategy.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Link className="rounded-[2rem] bg-ink p-6 text-paper shadow-panel transition hover:-translate-y-1" href={`/topics/${nextTopic.id}`}>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-paper/60">Continue practice</p>
          <h2 className="mt-4 font-display text-3xl font-bold">{nextTopic.title}</h2>
          <p className="mt-3 text-paper/70">{getQuestionsByTopic(nextTopic.id).length} starter questions ready.</p>
        </Link>
        <Link className="rounded-[2rem] bg-signal p-6 text-white shadow-panel transition hover:-translate-y-1" href="/coding-gym">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Coding Gym</p>
          <h2 className="mt-4 font-display text-3xl font-bold">Build coding confidence</h2>
          <p className="mt-3 text-white/80">Practice QA-flavored Python, Java, SQL, and TypeScript tasks.</p>
        </Link>
        <Link className="rounded-[2rem] bg-brass p-6 text-white shadow-panel transition hover:-translate-y-1" href={`/mock-interview/${nextTopic.id}`}>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">Mock Interview</p>
          <h2 className="mt-4 font-display text-3xl font-bold">Rehearse structured answers</h2>
          <p className="mt-3 text-white/80">Type an answer, reveal a model answer, and self-rate with a checklist.</p>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <ProgressSummary summary={summary} />
        <section className="rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-panel">
          <h2 className="font-display text-2xl font-bold text-blueprint">Weak topics</h2>
          {weakTopicIds.length ? (
            <div className="mt-4 space-y-3">
              {weakTopicIds.map((topicId) => {
                const topic = topics.find((item) => item.id === topicId);
                return topic ? (
                  <Link className="block rounded-2xl bg-paper/80 p-4 font-bold hover:bg-paper" href={`/topics/${topic.id}`} key={topic.id}>
                    {topic.title}
                  </Link>
                ) : null;
              })}
            </div>
          ) : (
            <p className="mt-4 leading-7 text-ink/70">No weak topics yet. Mark difficult questions as weak during practice.</p>
          )}
        </section>
      </div>
    </div>
  );
}
