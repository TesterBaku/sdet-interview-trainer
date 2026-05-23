import type { Metadata } from "next";
import { Suspense } from "react";
import { getTopic } from "@/lib/questionUtils";
import { MockInterviewClient } from "@/app/mock-interview/[topicId]/MockInterviewClient";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  return {
    title: topic
      ? `${topic.title} Mock Interview | SDET Interview Trainer`
      : "Mock Interview | SDET Interview Trainer",
    description: topic
      ? `Mock interview practice for ${topic.title} — type an answer, reveal a model answer, and self-rate.`
      : "Mock interview practice for SDET preparation.",
    openGraph: { url: `/mock-interview/${topicId}` },
  };
}

export default function MockInterviewPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white/80 p-6">Loading...</div>}>
      <MockInterviewClient />
    </Suspense>
  );
}
