import type { Metadata } from "next";
import { TopicsClient } from "@/app/topics/TopicsClient";

export const metadata: Metadata = {
  title: "All Topics | SDET Interview Trainer",
  description:
    "Browse all 10 SDET interview topics including Python, Java, SQL, Playwright, Selenium, API testing, CI/CD, AWS, and more.",
  openGraph: { url: "/topics" },
};

export default function TopicsPage() {
  return <TopicsClient />;
}
