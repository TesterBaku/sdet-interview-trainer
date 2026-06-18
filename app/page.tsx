import type { Metadata } from "next";
import { HomeClient } from "@/app/HomeClient";
import { cheatSheets } from "@/lib/cheatsheets";

export const metadata: Metadata = {
  title: "SDET Interview Trainer — Practice Like the Interview Is Already Scheduled",
  description:
    "Flashcards, quizzes, mock interviews and coding tasks for Python, Java, SQL, Playwright, Selenium, API testing, CI/CD and AWS.",
  openGraph: { url: "/" },
};

export default function HomePage() {
  // Count derived server-side so the homepage client bundle doesn't ship all
  // cheat-sheet content just to display a number (and the copy can't drift).
  return <HomeClient cheatSheetCount={cheatSheets.length} />;
}
