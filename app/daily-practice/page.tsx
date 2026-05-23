import type { Metadata } from "next";
import { DailyPracticeClient } from "@/app/daily-practice/DailyPracticeClient";

export const metadata: Metadata = {
  title: "Daily Practice | SDET Interview Trainer",
  description: "A focused 10-item daily mix: 3 coding, 2 SQL, 2 Playwright/Selenium, 2 API/CI/AWS, 1 strategy/mock.",
  openGraph: { url: "/daily-practice" },
};

export default function DailyPracticePage() {
  return <DailyPracticeClient todayIso={new Date().toISOString().slice(0, 10)} />;
}
