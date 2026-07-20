import type { Metadata } from "next";
import Link from "next/link";
import { getAllCheatSheetAudio } from "@/lib/audio";
import { getCheatSheet } from "@/lib/cheatsheets";
import { CommuteClient } from "./CommuteClient";

export const metadata: Metadata = {
  title: "Commute Mode | SDET Interview Trainer",
  description:
    "Listen to two-host podcast episodes that teach each SDET topic — hands-free, screen-free, one per cheat sheet.",
  openGraph: { url: "/commute" },
};

export default function CommutePage() {
  const episodes = getAllCheatSheetAudio().map((audio) => {
    const sheet = getCheatSheet(audio.id);
    return {
      id: audio.id,
      title: sheet?.title ?? audio.id,
      group: sheet?.group ?? "",
      accent: sheet?.accent ?? "#17324d",
      src: audio.mp3Url,
      captionsSrc: audio.vttUrl,
      durationSec: audio.durationSec,
    };
  });

  return (
    <div className="space-y-6">
      <header className="rounded-[2.5rem] border border-ink/10 bg-white/75 p-6 shadow-panel sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-signal">Commute Mode</p>
        <h1 className="mt-3 font-display text-3xl font-black text-blueprint sm:text-5xl">Learn with your eyes closed</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-ink/75">
          Every cheat sheet as a two-host podcast episode — a mentor and a candidate walking through the interview
          traps out loud. Queue them up for the commute; they play back-to-back.
        </p>
      </header>

      {episodes.length > 0 ? (
        <CommuteClient episodes={episodes} />
      ) : (
        <div className="rounded-[2rem] border border-ink/10 bg-white/75 p-8 text-center shadow-panel">
          <p className="text-lg font-bold text-blueprint">Audio isn&apos;t published here yet.</p>
          <p className="mt-2 text-ink/70">
            The episodes are generated offline and published separately. In the meantime,{" "}
            <Link className="font-bold text-signal" href="/cheatsheets">
              browse the cheat sheets
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
