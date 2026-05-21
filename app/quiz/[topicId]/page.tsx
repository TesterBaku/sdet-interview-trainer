import type { Metadata } from "next";
import { getTopic } from "@/lib/questionUtils";
import { QuizClient } from "@/app/quiz/[topicId]/QuizClient";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  return {
    title: topic ? `${topic.title} Quiz | SDET Interview Trainer` : "Quiz | SDET Interview Trainer",
    description: topic
      ? `Multiple-choice quiz for ${topic.title} — test your knowledge with immediate feedback.`
      : "Quiz practice for SDET interview preparation.",
    openGraph: { url: `/quiz/${topicId}` },
  };
}

export default function QuizPage() {
  return <QuizClient />;
}
