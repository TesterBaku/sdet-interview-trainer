"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AudioPlayer, type QueueTrack } from "@/components/AudioPlayer";
import { formatAudioMinutes, formatAudioTotal, formatClock } from "@/lib/audioFormat";
import {
  getCommuteProgressSnapshot,
  getServerCommuteProgressSnapshot,
  markAudioCompleted,
  readAudioPosition,
  readCommuteResume,
  readCompletedAudio,
  subscribeToCommuteProgress,
  writeCommuteResume,
} from "@/lib/audioPosition";

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

// Position/completed ids are namespaced per lane + episode so a queue's transient state never
// collides with the same topic's saved position on its cheat-sheet page.
const trackId = (laneKey: string, episodeId: string) => `commute:${laneKey}:${episodeId}`;

type ResumePoint = {
  laneIndex: number;
  episodeIndex: number;
  laneLabel: string;
  title: string;
  seconds: number;
};

export function CommuteClient({ lanes }: { lanes: Lane[] }) {
  const [laneIndex, setLaneIndex] = useState(0);
  // Per-lane playback position (#8): peeking at another lane must not reset the one you're in.
  // Missing key ⇒ episode 0.
  const [indexByLane, setIndexByLane] = useState<Record<string, number>>({});
  // Only auto-play after the listener has actually picked/advanced an episode, so landing on
  // the page — or switching lanes — never blares audio unprompted.
  const [autoPlay, setAutoPlay] = useState(false);
  // A one-shot "jump to saved position and play" command, issued only by an explicit Resume
  // click — so a normal landing/lane-switch never seeks, and (unlike a standing "resume mode")
  // auto-advanced episodes always start from the top.
  const [resumeCommand, setResumeCommand] = useState<{ seconds: number; token: number } | null>(null);
  const resumeToken = useRef(0);
  // The listener has started a session (picked/resumed/advanced) — hides the Resume banner,
  // which is only a "restore last time" affordance.
  const [hasStarted, setHasStarted] = useState(false);

  // The lane switcher is an ARIA tablist only when there's more than one lane to switch
  // between; with a single lane it's just the panel (no tabs rendered).
  const isTabbed = lanes.length > 1;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const lane = lanes[laneIndex];
  const episodes = lane.episodes;
  const index = indexByLane[lane.key] ?? 0;
  const upNext = episodes[index + 1];
  const laneTotalSec = useMemo(() => episodes.reduce((sum, ep) => sum + ep.durationSec, 0), [episodes]);

  // URL state (#11): mirror ?lane=&ep= so a lane/episode is linkable and refresh-proof. Uses
  // history.replaceState (not useSearchParams) to keep the page statically rendered. Seed once
  // from the URL on mount, then write on every subsequent lane/episode change.
  const seededUrl = useRef(false);
  useEffect(() => {
    if (seededUrl.current) return;
    seededUrl.current = true;
    const params = new URLSearchParams(window.location.search);
    const laneKey = params.get("lane");
    const epId = params.get("ep");
    const li = laneKey ? lanes.findIndex((l) => l.key === laneKey) : -1;
    const targetLane = lanes[li >= 0 ? li : 0];
    const ei = epId ? targetLane.episodes.findIndex((e) => e.id === epId) : -1;
    // window.location can't be read during the SSR/hydration render without a mismatch, so this
    // one-time seed is a legitimate post-hydration effect (not a continuous store).
    /* eslint-disable react-hooks/set-state-in-effect */
    if (li >= 0) setLaneIndex(li);
    if (ei >= 0) setIndexByLane((m) => ({ ...m, [targetLane.key]: ei }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [lanes]);

  const wroteUrlOnce = useRef(false);
  useEffect(() => {
    // Skip the initial mount so a passive landing doesn't rewrite the address bar.
    if (!wroteUrlOnce.current) {
      wroteUrlOnce.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("lane", lane.key);
    if (episodes[index]) params.set("ep", episodes[index].id);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [lane.key, index, episodes]);

  // One persistent queue for the player. Position ids are namespaced per lane + episode so the
  // queue's transient position never overwrites the saved position on a topic's cheat-sheet page.
  const queue = useMemo<QueueTrack[]>(
    () =>
      episodes.map((ep) => ({
        id: trackId(lane.key, ep.id),
        title: ep.title,
        src: ep.src,
        captionsSrc: ep.captionsSrc,
        durationSec: ep.durationSec,
        accent: ep.accent,
      })),
    [episodes, lane.key],
  );

  // Listened/partial state (#6) + the resume pointer (#3) are read from localStorage via an
  // external store: the server/pre-hydration snapshot is -1, so the memo below stays empty on
  // the first render (matching the localStorage-free server HTML) and fills in once live. Every
  // transition that matters (select / advance / finish) goes through a progress write, which
  // bumps `progressVersion` and re-reads — so checks and partial bars stay current without a
  // per-tick re-render, and the memo needs no lane/episode deps.
  const progressVersion = useSyncExternalStore(
    subscribeToCommuteProgress,
    getCommuteProgressSnapshot,
    getServerCommuteProgressSnapshot,
  );

  const { completedIds, positions, resumePoint } = useMemo(() => {
    const empty = {
      completedIds: [] as string[],
      positions: {} as Record<string, number>,
      resumePoint: null as ResumePoint | null,
    };
    if (progressVersion < 0) return empty; // server / pre-hydration — no localStorage yet

    const completed = readCompletedAudio();
    // Only the current lane's rows are rendered, so only its positions need reading.
    const pos: Record<string, number> = {};
    for (const ep of lanes[laneIndex].episodes) {
      const id = trackId(lanes[laneIndex].key, ep.id);
      const sec = readAudioPosition(id);
      if (sec > 0) pos[id] = sec;
    }

    let point: ResumePoint | null = null;
    const saved = readCommuteResume();
    if (saved) {
      const li = lanes.findIndex((l) => l.key === saved.laneKey);
      const ei = li >= 0 ? lanes[li].episodes.findIndex((e) => e.id === saved.episodeId) : -1;
      // Skip the banner when the pointer sits on an already-finished episode — that only happens
      // when the whole queue ran to its end, so there's nothing to resume (no restart-from-top).
      if (li >= 0 && ei >= 0 && !completed.includes(trackId(saved.laneKey, saved.episodeId))) {
        point = {
          laneIndex: li,
          episodeIndex: ei,
          laneLabel: lanes[li].label,
          title: lanes[li].episodes[ei].title,
          seconds: readAudioPosition(trackId(saved.laneKey, saved.episodeId)),
        };
      }
    }
    return { completedIds: completed, positions: pos, resumePoint: point };
  }, [progressVersion, lanes, laneIndex]);

  const setIndexFor = (laneKey: string, i: number) =>
    setIndexByLane((m) => ({ ...m, [laneKey]: i }));

  const recordResume = (laneKey: string, episodeId: string) => {
    writeCommuteResume({ laneKey, episodeId });
    setHasStarted(true);
  };

  const selectLane = (i: number) => {
    if (i === laneIndex) return;
    // Keep each lane's own position (#8); switching is a silent peek, never autoplay.
    setLaneIndex(i);
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

  // Playlist row click: start the episode from the top (the Resume banner is the dedicated
  // resume-from-position path).
  const select = (i: number) => {
    setAutoPlay(true);
    setIndexFor(lane.key, i);
    recordResume(lane.key, episodes[i].id);
  };

  // Auto-advance (or a Media Session next/prev): the player drove the index, so mirror it and
  // remember the new episode as the resume point.
  const onQueueIndexChange = (i: number) => {
    setIndexFor(lane.key, i);
    const ep = episodes[i];
    if (ep) recordResume(lane.key, ep.id);
  };

  const onTrackEnded = (endedId: string) => {
    markAudioCompleted(endedId); // bumps the progress store → playlist re-reads
  };

  const resumeHere = () => {
    if (!resumePoint) return;
    setLaneIndex(resumePoint.laneIndex);
    setIndexFor(lanes[resumePoint.laneIndex].key, resumePoint.episodeIndex);
    // One-shot command: seek to the saved second and play — works whether that episode's src is
    // already loaded (episode 0 on a fresh visit) or gets swapped in by the index change.
    resumeToken.current += 1;
    setResumeCommand({ seconds: resumePoint.seconds, token: resumeToken.current });
    setHasStarted(true);
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

      {resumePoint && !hasStarted ? (
        <button
          type="button"
          onClick={resumeHere}
          className="flex w-full items-center gap-3 rounded-2xl border border-signal/30 bg-signal/10 p-3 text-left shadow-panel transition hover:bg-signal/15 focus-ring"
        >
          <span aria-hidden className="text-lg">↻</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-black text-signal">Resume where you left off</span>
            <span className="block truncate text-sm font-bold text-blueprint">
              {isTabbed ? `${resumePoint.laneLabel} · ` : ""}
              {resumePoint.title}
              {resumePoint.seconds >= 3 ? ` · ${formatClock(resumePoint.seconds)}` : ""}
            </span>
          </span>
          <span aria-hidden className="font-black text-signal">→</span>
        </button>
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
            onQueueIndexChange={onQueueIndexChange}
            onTrackEnded={onTrackEnded}
            label={lane.playerLabel}
            subtitle={lane.playerSubtitle}
            icon={lane.icon}
            autoPlay={autoPlay}
            resume={false}
            resumeCommand={resumeCommand}
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

        <div>
          {/* Lane totals so a listener can plan the commute (#9). */}
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink/45">
            {episodes.length} {episodes.length === 1 ? "episode" : "episodes"} · ~{formatAudioTotal(laneTotalSec)}
          </p>
          <ol className="space-y-2" aria-label="Episode playlist">
          {episodes.map((ep, i) => {
            const active = i === index;
            const id = trackId(lane.key, ep.id);
            const done = completedIds.includes(id);
            const savedSec = positions[id] ?? 0;
            const ratio =
              !done && ep.durationSec > 0 ? Math.min(1, savedSec / ep.durationSec) : 0;
            const marker = active ? "▶" : done ? "✓" : i + 1;
            // Partial state is only shown on rows you're NOT on — the active episode's live
            // position is the player's job (the saved second wouldn't update mid-play here).
            const showPartial = !active && !done && ratio > 0.01;
            const statusNote = done ? "Listened" : showPartial ? `${formatClock(savedSec)} in` : "";
            return (
              <li key={ep.id}>
                <button
                  type="button"
                  onClick={() => select(i)}
                  aria-current={active ? "true" : undefined}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left shadow-panel transition focus-ring ${
                    active ? "border-ink/20 bg-white" : "border-ink/10 bg-white/70 hover:bg-white"
                  } ${done && !active ? "opacity-60" : ""}`}
                >
                  <span
                    aria-hidden
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-paper"
                    style={{ backgroundColor: ep.accent }}
                  >
                    {marker}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-blueprint">{ep.title}</span>
                    <span className="block text-xs font-semibold text-ink/55">
                      {ep.group ? `${ep.group} · ` : ""}
                      {formatAudioMinutes(ep.durationSec)}
                      {statusNote ? ` · ${statusNote}` : ""}
                    </span>
                  </span>
                  {/* Thin progress bar for a partially-heard episode you're not currently on. */}
                  {showPartial ? (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-1 rounded-full bg-signal/70"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
          </ol>
        </div>
      </div>
    </div>
  );
}
