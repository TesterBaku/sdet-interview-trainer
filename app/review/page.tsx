import type { Metadata } from "next";
import { ReviewClient } from "@/app/review/ReviewClient";

export const metadata: Metadata = {
  title: "Review Queue | SDET Interview Trainer",
  description: "All questions you marked as weak or review-later, across every topic. Filter by status or topic.",
  openGraph: { url: "/review" },
};

export default function ReviewPage() {
  return <ReviewClient />;
}
