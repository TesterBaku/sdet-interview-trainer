import type { MetadataRoute } from "next";
import { topics } from "@/lib/questionUtils";

const base = "https://sdet-interview-trainer.vercel.app";
const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/topics`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/coding-gym`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/progress`, lastModified: now, changeFrequency: "never", priority: 0.5 },
  ];

  const topicRoutes: MetadataRoute.Sitemap = topics.flatMap((topic) => [
    { url: `${base}/topics/${topic.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${base}/flashcards/${topic.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/quiz/${topic.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/mock-interview/${topic.id}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
  ]);

  return [...staticRoutes, ...topicRoutes];
}
