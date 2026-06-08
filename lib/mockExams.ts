import ccaFoundations from "@/data/mock-exams/cca-foundations.json";
import type { MockExam } from "@/types/MockExam";

export const mockExams = [ccaFoundations] as MockExam[];

export function getMockExam(id: string): MockExam | undefined {
  return mockExams.find((exam) => exam.id === id);
}
