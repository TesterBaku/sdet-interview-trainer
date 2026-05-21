import type { Metadata } from "next";
import { getTopic } from "@/lib/questionUtils";
import { TopicDetailClient } from "@/app/topics/[topicId]/TopicDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  return {
    title: topic ? `${topic.title} | SDET Interview Trainer` : "Topic | SDET Interview Trainer",
    description: topic
      ? `Practice ${topic.title} with flashcards, quizzes, and mock interviews. ${topic.description}`
      : "SDET interview practice for this topic.",
    openGraph: { url: `/topics/${topicId}` },
  };
}

export default function TopicDetailPage() {
  return <TopicDetailClient />;
}
