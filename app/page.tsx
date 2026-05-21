import type { Metadata } from "next";
import { HomeClient } from "@/app/HomeClient";

export const metadata: Metadata = {
  title: "SDET Interview Trainer — Practice Like the Interview Is Already Scheduled",
  description:
    "Flashcards, quizzes, mock interviews and coding tasks for Python, Java, SQL, Playwright, Selenium, API testing, CI/CD and AWS.",
  openGraph: { url: "/" },
};

export default function HomePage() {
  return <HomeClient />;
}
