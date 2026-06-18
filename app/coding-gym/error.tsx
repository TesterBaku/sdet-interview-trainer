"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CodingGymError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the failure in the console / monitoring rather than swallowing it.
    console.error("Coding Gym failed to load:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2.5rem] border border-ink/10 bg-white/75 p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Coding Gym</p>
        <h1 className="mt-3 font-display text-3xl font-black text-blueprint sm:text-4xl">
          Couldn&apos;t load the coding tasks
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-ink/75">
          Something went wrong while loading this page. Your saved progress is safe — it&apos;s stored
          on your device. Try again, or head back to your topics.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-blueprint px-5 py-2 text-sm font-bold text-paper transition hover:bg-blueprint/90 focus-ring"
          >
            Try again
          </button>
          <Link
            href="/topics"
            className="rounded-full border border-blueprint/30 px-5 py-2 text-sm font-bold text-blueprint transition hover:bg-blueprint/5 focus-ring"
          >
            Back to topics
          </Link>
        </div>
      </section>
    </div>
  );
}
