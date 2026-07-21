"use client";

import { useMemo, useRef, useState } from "react";
import { AudioPlayer, type QueueTrack } from "@/components/AudioPlayer";
import { formatAudioMinutes } from "@/lib/audioFormat";

type Episode = {
  id: string;
  title: string;
  group: string;
  accent: string;
  src: string;
  captionsSrc: string;
  durationSec: number;
};

// A lane is one playlist (all podcast episodes, or all mock-interview rounds) plus the
// labels its player should carry.
export type Lane = {
  key: string;
  label: string;
  playerLabel: string;
  playerSubtitle: string;
  icon: string;
  episodes: Episode[];
};

export function CommuteClient({ lanes }: { lanes: Lane[] }) {
  const [laneIndex, setLaneIndex] = useState(0);
  const [index, setIndex] = useState(0);
  // Only auto-play after the listener has actually picked/advanced an episode, so landing on
  // the page — or switching lanes — never blares audio unprompted.
  const [autoPlay, setAutoPlay] = useState(false);
  // The lane switcher is an ARIA tablist only when there's more than one lane to switch
  // between; with a single lane it's just the panel (no tabs rendered).
  const isTabbed = lanes.length > 1;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const lane = lanes[laneIndex];
  const episodes = lane.episodes;
  const upNext = episodes[index + 1];

  // One persistent queue for the player. Position ids are namespaced per lane + episode so the
  // queue's transient position never overwrites the saved position on a topic's cheat-sheet page.
  const queue = useMemo<QueueTrack[]>(
    () =>
      episodes.map((ep) => ({
        id: `commute:${lane.key}:${ep.id}`,
        title: ep.title,
        src: ep.src,
        captionsSrc: ep.captionsSrc,
        durationSec: ep.durationSec,
        accent: ep.accent,
      })),
    [episodes, lane.key],
  );

  const selectLane = (i: number) => {
    if (i === laneIndex) return;
    setLaneIndex(i);
    setIndex(0);
    setAutoPlay(false);
  };
  // Arrow/Home/End move the selected tab and take focus with them (automatic activation),
  // per the WAI-ARIA tabs pattern; the tablist uses roving tabindex (only the active tab is
  // in the tab order).
  const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const count = lanes.length;
    let next = laneIndex;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (laneIndex + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (laneIndex - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    else return;
    e.preventDefault();
    selectLane(next);
    tabRefs.current[next]?.focus();
  };
  const select = (i: number) => {
    setAutoPlay(true);
    setIndex(i);
  };

  return (
    <div className="space-y-4">
      {lanes.length > 1 ? (
        <div
          role="tablist"
          aria-label="Audio format"
          className="inline-flex gap-1 rounded-full border border-ink/10 bg-white/70 p-1 shadow-panel"
        >
          {lanes.map((l, i) => (
            <button
              key={l.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`commute-tab-${l.key}`}
              aria-controls="commute-tabpanel"
              aria-selected={i === laneIndex}
              tabIndex={i === laneIndex ? 0 : -1}
              onClick={() => selectLane(i)}
              onKeyDown={onTabKeyDown}
              className={`rounded-full px-4 py-2 text-sm font-bold transition focus-ring ${
                i === laneIndex ? "bg-blueprint text-paper" : "text-ink/70 hover:text-blueprint"
              }`}
            >
              <span aria-hidden>{l.icon}</span> {l.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div
          className="lg:sticky lg:top-24 lg:self-start"
          // When lanes are tabs, this is the tabpanel they control; labelled by the active
          // tab. With a single lane there are no tabs, so the role is omitted.
          {...(isTabbed
            ? { role: "tabpanel", id: "commute-tabpanel", "aria-labelledby": `commute-tab-${lane.key}`, tabIndex: 0 }
            : {})}
        >
          <AudioPlayer
            // One persistent player for the whole lane: the queue drives which episode plays,
            // and it auto-advances in place (no remount) so playback survives a locked screen.
            // Re-keyed only per lane so switching formats resets to that lane's first episode.
            key={lane.key}
            queue={queue}
            queueIndex={index}
            onQueueIndexChange={setIndex}
            label={lane.playerLabel}
            subtitle={lane.playerSubtitle}
            icon={lane.icon}
            autoPlay={autoPlay}
            resume={false}
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
                      {formatAudioMinutes(ep.durationSec)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
