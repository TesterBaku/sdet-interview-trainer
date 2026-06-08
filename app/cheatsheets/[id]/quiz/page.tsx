import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cheatSheets, getCheatSheet } from "@/lib/cheatsheets";
import { CheatSheetQuizClient } from "@/app/cheatsheets/[id]/quiz/CheatSheetQuizClient";

export function generateStaticParams() {
  return cheatSheets.map((sheet) => ({ id: sheet.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sheet = getCheatSheet(id);
  return {
    title: sheet ? `${sheet.title} Quiz | SDET Interview Trainer` : "Quiz | SDET Interview Trainer",
    description: sheet
      ? `Multiple-choice quiz for the ${sheet.title} cheat sheet — test your knowledge with immediate feedback.`
      : "Cheat-sheet quiz for SDET interview preparation.",
    openGraph: { url: `/cheatsheets/${id}/quiz` },
  };
}

export default async function CheatSheetQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCheatSheet(id)) notFound();

  return (
    <Suspense fallback={<div className="rounded-2xl bg-white/80 p-6">Loading...</div>}>
      <CheatSheetQuizClient />
    </Suspense>
  );
}
