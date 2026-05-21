import type { Metadata } from "next";
import { CodingGymClient } from "@/app/coding-gym/CodingGymClient";

export const metadata: Metadata = {
  title: "Coding Gym | SDET Interview Trainer",
  description:
    "Hands-on coding practice for QA/SDET roles — Python, Java, SQL, and TypeScript tasks with hints, solutions, and sandbox.",
  openGraph: { url: "/coding-gym" },
};

export default function CodingGymPage() {
  return <CodingGymClient />;
}
