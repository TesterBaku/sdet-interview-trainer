import type { Metadata } from "next";
import { QuizzesClient } from "@/app/quizzes/QuizzesClient";

export const metadata: Metadata = {
  title: "Quizzes | SDET Interview Trainer",
  description:
    "Learn through multiple-choice quizzes drawn from the SDET cheat sheets — Playwright, Selenium, SQL, Docker, Kubernetes, Python, Java, JavaScript, C#, and more.",
  openGraph: { url: "/quizzes" },
};

export default function QuizzesPage() {
  return <QuizzesClient />;
}
