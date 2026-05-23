import type { Question } from "@/types/Question";

// Maps a question to the practice mode that owns it. Used by /review and
// /daily-practice to deep-link items into the correct UI surface.
export function practiceHref(question: Question): string {
  const itemParam = `question=${encodeURIComponent(question.id)}`;
  if (question.type === "coding") return `/coding-gym?topic=${question.topicId}&${itemParam}`;
  if (question.type === "quiz") return `/quiz/${question.topicId}?${itemParam}`;
  if (question.type === "interview" || question.type === "scenario") {
    return `/mock-interview/${question.topicId}?${itemParam}`;
  }
  return `/flashcards/${question.topicId}?${itemParam}`;
}
