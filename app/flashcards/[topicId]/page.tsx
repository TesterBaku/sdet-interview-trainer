import type { Metadata } from "next";
import { Suspense } from "react";
import { getTopic } from "@/lib/questionUtils";
import { FlashcardsClient } from "@/app/flashcards/[topicId]/FlashcardsClient";

export async function generateMetadata({ params }: { params: Promise<{ topicId: string }> }): Promise<Metadata> {
  const { topicId } = await params;
  const topic = getTopic(topicId);
  return {
    title: topic ? `${topic.title} Flashcards | SDET Interview Trainer` : "Flashcards | SDET Interview Trainer",
    description: topic
      ? `Flashcard practice for ${topic.title} — reveal answers and track weak areas.`
      : "Flashcard practice for SDET interview preparation.",
    openGraph: { url: `/flashcards/${topicId}` },
  };
}

export default function FlashcardsPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white/80 p-6">Loading...</div>}>
      <FlashcardsClient />
    </Suspense>
  );
}
