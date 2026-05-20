import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SDET Interview Trainer",
    short_name: "SDET Trainer",
    description:
      "Flashcards, quizzes, mock interviews, and coding tasks for QA Automation and SDET interview prep.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6efe3",
    theme_color: "#17324d",
    categories: ["education"],
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
