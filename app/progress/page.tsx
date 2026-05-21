import type { Metadata } from "next";
import { ProgressClient } from "@/app/progress/ProgressClient";

export const metadata: Metadata = {
  title: "Your Progress | SDET Interview Trainer",
  description:
    "Track your SDET interview readiness by topic — see completed questions, weak areas, and overall completion.",
  openGraph: { url: "/progress" },
};

export default function ProgressPage() {
  return <ProgressClient />;
}
