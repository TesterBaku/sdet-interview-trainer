import type { Question } from "@/types/Question";

export type CheatSheetSection = {
  id: string;
  title: string;
  bodyHtml: string;
};

export type CheatSheetGroup = "Test Frameworks" | "API & Data" | "DevOps & CI" | "Languages";

export type CheatSheet = {
  id: string;
  title: string;
  group: CheatSheetGroup;
  accent: string;
  summary: string;
  tags: string[];
  sections: CheatSheetSection[];
  quiz: Question[];
};
