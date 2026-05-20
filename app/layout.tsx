import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { PwaInit } from "@/components/PwaInit";

export const metadata: Metadata = {
  title: "SDET Interview Trainer",
  description: "QA Automation and SDET interview practice with flashcards, quizzes, mock interviews, and coding tasks.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SDET Trainer",
  },
};

export const viewport: Viewport = {
  themeColor: "#17324d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <PwaInit />
        <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
