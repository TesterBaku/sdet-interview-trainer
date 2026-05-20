"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ProgressSummary } from "@/components/ProgressSummary";
import { getInterviewQuestions, getQuestionsByTopic, getQuizQuestions, getTopic } from "@/lib/questionUtils";
import { summarizeTopicProgress, useProgress } from "@/lib/progress";

export default function TopicDetailPage() {
  const params = useParams<{ topicId: string }>();
  const topic = getTopic(params.topicId);
  const questions = getQuestionsByTopic(params.topicId);
  const quizCount = getQuizQuestions(params.topicId).length;
  const interviewCount = getInterviewQuestions(params.topicId).length;
  const { progress } = useProgress();

  if (!topic) {
    return <p className="rounded-2xl bg-white/80 p-6">Topic not found.</p>;
  }

  const summary = summarizeTopicProgress(progress, topic.id);

  const actions = [
    { href: `/flashcards/${topic.id}`, title: "Flashcards", body: `${questions.length} questions with answer reveal and status tracking.` },
    { href: `/quiz/${topic.id}`, title: "Quiz", body: `${quizCount} multiple-choice checks with explanations.` },
    { href: `/mock-interview/${topic.id}`, title: "Mock Interview", body: `${interviewCount} interview/scenario prompts with self-rating.` },
    { href: `/flashcards/${topic.id}`, title: "Review Weak Questions", body: "Use flashcards and mark weak items as you improve." }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2.5rem] border border-ink/10 bg-white/75 p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">{topic.category}</p>
        <h1 className="mt-3 font-display text-5xl font-black text-blueprint">{topic.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">{topic.description}</p>
      </section>
      <ProgressSummary summary={summary} title="Topic progress" />
      <div className="grid gap-5 md:grid-cols-2">
        {actions.map((action) => (
          <Link className="rounded-[2rem] border border-ink/10 bg-white/75 p-6 shadow-panel transition hover:-translate-y-1 hover:bg-white" href={action.href} key={action.title}>
            <h2 className="font-display text-3xl font-bold text-blueprint">{action.title}</h2>
            <p className="mt-3 leading-7 text-ink/70">{action.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
