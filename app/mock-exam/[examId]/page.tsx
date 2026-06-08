import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getMockExam, mockExams } from "@/lib/mockExams";
import { MockExamClient } from "@/app/mock-exam/[examId]/MockExamClient";

export function generateStaticParams() {
  return mockExams.map((exam) => ({ examId: exam.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ examId: string }> }): Promise<Metadata> {
  const { examId } = await params;
  const exam = getMockExam(examId);
  return {
    title: exam ? `${exam.title} Mock Exam | SDET Interview Trainer` : "Mock Exam | SDET Interview Trainer",
    description: exam?.description ?? "Mock certification exam with domain breakdown and pass/fail scoring.",
    openGraph: { url: `/mock-exam/${examId}` },
  };
}

export default async function MockExamPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  if (!getMockExam(examId)) notFound();

  return (
    <Suspense fallback={<div className="rounded-2xl bg-white/80 p-6">Loading...</div>}>
      <MockExamClient />
    </Suspense>
  );
}
