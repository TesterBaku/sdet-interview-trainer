import type { Question } from "@/types/Question";

// Maps a question to the practice mode that owns it. Used by /review and
// /daily-practice to deep-link items into the correct UI surface.
export function practiceHref(question: Question): string {
  if (question.type === "coding") return `/coding-gym?topic=${question.topicId}`;
  if (question.type === "quiz") return `/quiz/${question.topicId}`;
  if (question.type === "interview" || question.type === "scenario") return `/mock-interview/${question.topicId}`;
  return `/flashcards/${question.topicId}`;
}
