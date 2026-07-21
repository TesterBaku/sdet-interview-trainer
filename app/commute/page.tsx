import type { Metadata } from "next";
import Link from "next/link";
import { getAllCheatSheetAudio, getAllInterviewAudio, orderAudioByCurriculum } from "@/lib/audio";
import { getCheatSheet } from "@/lib/cheatsheets";
import { CommuteClient, type Lane } from "./CommuteClient";

export const metadata: Metadata = {
  title: "Commute Mode | SDET Interview Trainer",
  description:
    "Listen hands-free: two-host podcast episodes and mock-interview rounds that teach each SDET topic — screen-free, one per cheat sheet.",
  openGraph: { url: "/commute" },
};

function toEpisode(audio: { id: string; mp3Url: string; vttUrl: string; durationSec: number }) {
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
}

export default function CommutePage() {
  const podcast = orderAudioByCurriculum(getAllCheatSheetAudio()).map(toEpisode);
  const interview = orderAudioByCurriculum(getAllInterviewAudio()).map(toEpisode);

  const lanes: Lane[] = [];
  if (podcast.length > 0) {
    lanes.push({
      key: "podcast",
      label: "Podcast",
      playerLabel: "Listen",
      playerSubtitle: "Two-host episode",
      icon: "🎧",
      episodes: podcast,
    });
  }
  if (interview.length > 0) {
    lanes.push({
      key: "interview",
      label: "Mock Interview",
      playerLabel: "Mock interview",
      playerSubtitle: "Mock interview",
      icon: "🎤",
      episodes: interview,
    });
  }

  return (
    <div className="space-y-6">
      {/* Compact on mobile so the player + lane tabs sit above the fold; full-size from sm up (#12). */}
      <header className="rounded-[2rem] border border-ink/10 bg-white/75 p-4 shadow-panel sm:rounded-[2.5rem] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.28em] text-signal sm:text-sm">Commute Mode</p>
        <h1 className="mt-2 font-display text-2xl font-black text-blueprint sm:mt-3 sm:text-5xl">Learn with your eyes closed</h1>
        <p className="mt-2 hidden max-w-3xl text-lg leading-8 text-ink/75 sm:mt-4 sm:block">
          Every topic as audio — a two-host podcast that walks the interview traps out loud, and a mock-interview round
          where a candidate models strong answers. Queue them up for the commute; they play back-to-back.
        </p>
        {/* A one-line summary stands in for the full intro on small screens. */}
        <p className="mt-1 text-sm text-ink/70 sm:hidden">Podcast + mock-interview audio for every topic — plays back-to-back.</p>
      </header>

      {lanes.length > 0 ? (
        <CommuteClient lanes={lanes} />
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
