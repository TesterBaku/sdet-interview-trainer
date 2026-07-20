"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";

type Episode = {
  id: string;
  title: string;
  group: string;
  accent: string;
  src: string;
  captionsSrc: string;
  durationSec: number;
};

function minutes(sec: number): string {
  return `${Math.max(1, Math.round(sec / 60))} min`;
}

export function CommuteClient({ episodes }: { episodes: Episode[] }) {
  const [index, setIndex] = useState(0);
  // Only auto-play after the listener has actually picked/advanced an episode, so landing on
  // the page never blares audio unprompted.
  const [autoPlay, setAutoPlay] = useState(false);
  const current = episodes[index];

  const select = (i: number) => {
    setAutoPlay(true);
    setIndex(i);
  };
  const advance = () => {
    if (index + 1 < episodes.length) {
      setAutoPlay(true);
      setIndex(index + 1);
    }
  };

  const upNext = episodes[index + 1];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <AudioPlayer
          key={current.id}
          id={current.id}
          title={current.title}
          src={current.src}
          captionsSrc={current.captionsSrc}
          durationSec={current.durationSec}
          accent={current.accent}
          autoPlay={autoPlay}
          onEnded={advance}
        />
        <p className="mt-3 px-1 text-sm text-ink/60">
          {upNext ? (
            <>
              Up next: <span className="font-bold text-blueprint">{upNext.title}</span>
            </>
          ) : (
            "Last episode in the queue."
          )}
        </p>
      </div>

      <ol className="space-y-2" aria-label="Episode playlist">
        {episodes.map((ep, i) => {
          const active = i === index;
          return (
            <li key={ep.id}>
              <button
                type="button"
                onClick={() => select(i)}
                aria-current={active ? "true" : undefined}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left shadow-panel transition focus-ring ${
                  active ? "border-ink/20 bg-white" : "border-ink/10 bg-white/70 hover:bg-white"
                }`}
              >
                <span
                  aria-hidden
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-paper"
                  style={{ backgroundColor: ep.accent }}
                >
                  {active ? "▶" : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-blueprint">{ep.title}</span>
                  <span className="block text-xs font-semibold text-ink/55">
                    {ep.group ? `${ep.group} · ` : ""}
                    {minutes(ep.durationSec)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
