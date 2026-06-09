import type { Question } from "@/types/Question";

export type CheatSheetSection = {
  id: string;
  title: string;
  bodyHtml: string;
};

export type CheatSheetGroup =
  | "Test Frameworks"
  | "API & Data"
  | "DevOps & CI"
  | "Languages"
  | "AI & LLMs"
  | "Certifications";

export type CheatSheet = {
  id: string;
  title: string;
  group: CheatSheetGroup;
  accent: string;
  summary: string;
  tags: string[];
  sections: CheatSheetSection[];
  quiz: Question[];
  // When set, this sheet's self-test is a dedicated Mock Exam (see lib/mockExams) rather
  // than the inline per-sheet quiz (quiz is empty in that case).
  mockExamId?: string;
};
