"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  clearAudioPosition,
  getServerAudioRate,
  readAudioPosition,
  readAudioRate,
  subscribeToAudioRate,
  writeAudioPosition,
  writeAudioRate,
} from "@/lib/audioPosition";
import { formatClock } from "@/lib/audioFormat";
import type { TranscriptCue } from "@/lib/audio";

// One track the player can load. In single-track mode (cheat-sheet pages) the fields are
// passed directly; in queue mode (Commute) they come from `queue[queueIndex]`.
export type QueueTrack = {
  id: string;
  title: string;
  src: string;
  captionsSrc: string;
  durationSec: number;
  accent?: string;
};

type AudioPlayerProps = {
  // Single-track mode: pass the track fields directly.
  id?: string;
  title?: string;
  src?: string;
  captionsSrc?: string;
  durationSec?: number;
  // Queue mode: pass the whole playlist + the controlled current index. The player keeps ONE
  // persistent <audio> element and swaps its src in place, so back-to-back playback survives
  // iOS lock-screen autoplay limits (a freshly-mounted element would be refused mid-queue).
  queue?: QueueTrack[];
  queueIndex?: number;
  onQueueIndexChange?: (index: number) => void;
  cues?: TranscriptCue[];
  accent?: string;
  autoPlay?: boolean;
  // Accessible-name prefix + visible descriptor + icon, so a page can host more than one
  // player (e.g. a podcast episode and a mock-interview round) with distinct labels.
  label?: string;
  subtitle?: string;
  icon?: string;
  // Resume from the saved position on load. Off for the Commute playlist, where each
  // episode starts from the beginning as it's queued.
  resume?: boolean;
  onEnded?: () => void;
  // Fires on EVERY track's `ended` (before any auto-advance), with the id that just finished —
  // so a queue host can mark it listened. `onEnded` differs: it fires only when the queue runs out.
  onTrackEnded?: (trackId: string) => void;
  // One-shot "jump into this track at `seconds` and play" command (bump `token` to re-issue).
  // Used by the Commute Resume affordance so an explicit resume works whether the target src is
  // already loaded (e.g. episode 0) or just swapped in — unlike `resume`, it's not a standing
  // mode, so auto-advanced episodes still start from the top.
  resumeCommand?: { seconds: number; token: number } | null;
};

const RATES = [1, 1.25, 1.5, 2] as const;
type Rate = (typeof RATES)[number];

const hasMediaSession = () => typeof navigator !== "undefined" && "mediaSession" in navigator;

export function AudioPlayer({
  id,
  title,
  src,
  captionsSrc,
  durationSec,
  queue,
  queueIndex,
  onQueueIndexChange,
  cues = [],
  accent = "#17324d",
  autoPlay = false,
  label = "Listen",
  subtitle = "Two-host episode",
  icon = "🎧",
  resume = true,
  onEnded,
  onTrackEnded,
  resumeCommand,
}: AudioPlayerProps) {
  // The active track resolves from the queue when present, else the single-track props.
  const activeTrack = queue && queueIndex != null ? queue[queueIndex] : null;
  const trackId = activeTrack?.id ?? id ?? "audio";
  const trackTitle = activeTrack?.title ?? title ?? "";
  const trackSrc = activeTrack?.src ?? src ?? "";
  const trackCaptions = activeTrack?.captionsSrc ?? captionsSrc ?? "";
  const trackDurationProp = activeTrack?.durationSec ?? durationSec ?? 0;
  const trackAccent = activeTrack?.accent ?? accent;

  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedSecond = useRef(-1);
  // The src currently loaded into the element. Because src is set imperatively (not via a
  // React-controlled attribute), this guards the load effect from reloading a src the ended
  // handler already swapped in — which would restart the just-started next episode.
  const loadedSrcRef = useRef<string | null>(null);
  // The last resume command consumed, so a re-render never re-applies the same jump.
  const handledResumeToken = useRef(-1);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(trackDurationProp);
  const [showTranscript, setShowTranscript] = useState(false);
  // Flaky-network resilience (#4): `buffering` while an actively-playing element waits for
  // data, `errored` when a source fails (or a stall drags on). Recovery is user-driven — Retry
  // the current episode or (in a queue) Skip to the next — so a transient blip never silently
  // loses the episode you were on, and a dead connection never cascades through the playlist.
  const [buffering, setBuffering] = useState(false);
  const [errored, setErrored] = useState(false);
  // A prolonged stall (waiting with no error/playing) escalates to the error card after this.
  const stallTimer = useRef<number | null>(null);
  const STALL_ESCALATE_MS = 20000;
  // Speed is a persisted global preference read via an external store (hydration-safe;
  // server snapshot is always 1, so no SSR mismatch), which also survives remounts.
  const rate = useSyncExternalStore(subscribeToAudioRate, readAudioRate, getServerAudioRate);

  // Apply the current speed to the element whenever it changes.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrent(seconds);
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(Math.max(0, audio.currentTime + delta), audio.duration || 0);
    audio.currentTime = next;
    setCurrent(next);
  }, []);

  // Load track `i` into the SAME element and (optionally) continue playback synchronously.
  // Used by auto-advance and the Media Session next/previous buttons.
  const goToIndex = useCallback(
    (i: number, play: boolean): boolean => {
      if (!queue || i < 0 || i >= queue.length) return false;
      const next = queue[i];
      const audio = audioRef.current;
      loadedSrcRef.current = next.src;
      if (audio) {
        audio.src = next.src;
        audio.load();
        audio.playbackRate = rate;
        if (play) void audio.play().catch(() => undefined);
      }
      lastSavedSecond.current = -1;
      setCurrent(0);
      setDuration(next.durationSec);
      setErrored(false);
      setBuffering(false);
      if (stallTimer.current != null) {
        window.clearTimeout(stallTimer.current);
        stallTimer.current = null;
      }
      onQueueIndexChange?.(i);
      return true;
    },
    [queue, onQueueIndexChange, rate],
  );

  // Set the source imperatively (uncontrolled) so the ended handler can swap tracks in place
  // without React re-setting the attribute and interrupting playback. Skips when the ended
  // handler already loaded this src.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !trackSrc || loadedSrcRef.current === trackSrc) return;
    loadedSrcRef.current = trackSrc;
    audio.src = trackSrc;
    audio.load();
    audio.playbackRate = rate;
    lastSavedSecond.current = -1;
    setCurrent(0);
    setDuration(trackDurationProp);
    setErrored(false);
    setBuffering(false);
    if (stallTimer.current != null) {
      window.clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
    if (autoPlay) void audio.play().catch(() => undefined);
  }, [trackSrc, autoPlay, rate, trackDurationProp]);

  // Consume a one-shot resume command. Declared after the load effect so, when the command
  // arrives together with a track switch, the new src is already attached; setting currentTime
  // on a still-loading element queues the seek until metadata arrives (survives `load()`), and
  // it also works when the src is unchanged (the resume target is the already-loaded track).
  useEffect(() => {
    if (!resumeCommand || resumeCommand.token === handledResumeToken.current) return;
    handledResumeToken.current = resumeCommand.token;
    const audio = audioRef.current;
    if (!audio) return;
    // Seek then play; the resulting timeupdate carries the position into `current` (no
    // setState here — resume is a user gesture, so play() is allowed and playback starts).
    if (resumeCommand.seconds > 0) audio.currentTime = resumeCommand.seconds;
    void audio.play().catch(() => undefined);
  }, [resumeCommand]);

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || trackDurationProp);
    audio.playbackRate = rate;
    if (!resume) return;
    const saved = readAudioPosition(trackId);
    if (saved > 0 && saved < (audio.duration || trackDurationProp) - 2) {
      audio.currentTime = saved;
      setCurrent(saved);
    }
  }, [trackId, trackDurationProp, resume, rate]);

  // Persist position at most once per whole second (timeupdate fires ~4×/sec) and mirror it
  // to the OS media session so the lock-screen scrubber tracks playback.
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    const whole = Math.floor(audio.currentTime);
    if (whole > 0 && whole !== lastSavedSecond.current) {
      lastSavedSecond.current = whole;
      writeAudioPosition(trackId, whole);
    }
    if (hasMediaSession() && navigator.mediaSession.setPositionState) {
      const dur = audio.duration;
      if (dur && Number.isFinite(dur)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime, dur),
          });
        } catch {
          // setPositionState throws on inconsistent values (e.g. mid-seek) — safe to ignore.
        }
      }
    }
  }, [trackId]);

  const onEndedInternal = useCallback(() => {
    clearAudioPosition(trackId);
    onTrackEnded?.(trackId);
    lastSavedSecond.current = -1;
    // Auto-advance by swapping src on the SAME element synchronously inside the ended handler,
    // which browsers treat as a continuation of the current session (survives lock-screen).
    if (queue && queueIndex != null && queueIndex + 1 < queue.length) {
      goToIndex(queueIndex + 1, true);
      return;
    }
    setPlaying(false);
    onEnded?.();
  }, [trackId, queue, queueIndex, goToIndex, onEnded, onTrackEnded]);

  const clearStallTimer = useCallback(() => {
    if (stallTimer.current != null) {
      window.clearTimeout(stallTimer.current);
      stallTimer.current = null;
    }
  }, []);

  // Buffering: the element is waiting for data. If a stall drags on with no recovery, escalate
  // to the error card so the listener gets a Retry/Skip path (a silent forever-spinner can't
  // be recovered without a page reload).
  const onWaiting = useCallback(() => {
    setBuffering(true);
    clearStallTimer();
    stallTimer.current = window.setTimeout(() => {
      setBuffering(false);
      setErrored(true);
    }, STALL_ESCALATE_MS);
  }, [clearStallTimer]);
  const clearBuffering = useCallback(() => {
    setBuffering(false);
    clearStallTimer();
  }, [clearStallTimer]);
  const onPlaying = useCallback(() => {
    clearBuffering();
    setErrored(false);
  }, [clearBuffering]);
  const onPauseInternal = useCallback(() => {
    setPlaying(false);
    clearBuffering(); // a paused track isn't buffering — don't leave the spinner up
  }, [clearBuffering]);

  // A source failed. Surface a recoverable card (Retry the current episode, or Skip in a queue)
  // rather than auto-advancing — an unprompted skip loses the current episode on a transient
  // blip and, over a dead connection, would cascade the whole queue.
  const onError = useCallback(() => {
    clearBuffering();
    setPlaying(false);
    setErrored(true);
  }, [clearBuffering]);

  // Retry re-loads and resumes from where playback was, so a blip near the end doesn't restart
  // a long episode (and the elapsed-time readout stays truthful — `current` is the seek target).
  const retry = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setErrored(false);
    const resumeAt = current;
    audio.load();
    if (resumeAt > 0) audio.currentTime = resumeAt;
    void audio.play().catch(() => undefined);
  }, [current]);

  const skipToNext = useCallback(() => {
    if (queue != null && queueIndex != null && queueIndex + 1 < queue.length) {
      goToIndex(queueIndex + 1, true);
    }
  }, [queue, queueIndex, goToIndex]);

  // Stop the stall timer if the player unmounts mid-buffer.
  useEffect(() => clearStallTimer, [clearStallTimer]);

  // Play state is driven by the element's own play/pause events (below), so a blocked
  // play() never leaves the icon out of sync.
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  const cycleRate = useCallback(() => {
    const currentIndex = RATES.indexOf(rate as Rate); // -1 (unknown stored value) → next is RATES[0]
    writeAudioRate(RATES[(currentIndex + 1) % RATES.length]);
  }, [rate]);

  // Claim the OS media session: lock-screen / notification / headphone / car controls. Metadata
  // + handlers are (re)published on play and on track change; the currently-playing player wins
  // when a page hosts more than one. Feature-detected; a no-op where unsupported.
  useEffect(() => {
    if (!hasMediaSession()) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: trackTitle,
      artist: "SDET Interview Trainer",
      album: label,
      artwork: [
        { src: "/icon", sizes: "512x512", type: "image/png" },
        { src: "/icon", sizes: "192x192", type: "image/png" },
      ],
    });
    ms.playbackState = playing ? "playing" : "paused";
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Some browsers don't support every action — ignore the ones they reject.
      }
    };
    set("play", () => void audioRef.current?.play().catch(() => undefined));
    set("pause", () => audioRef.current?.pause());
    set("seekbackward", (d) => skip(-(d.seekOffset ?? 15)));
    set("seekforward", (d) => skip(d.seekOffset ?? 30));
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") seekTo(d.seekTime);
    });
    const canPrev = queue != null && queueIndex != null && queueIndex > 0;
    const canNext = queue != null && queueIndex != null && queueIndex + 1 < queue.length;
    set("previoustrack", canPrev ? () => goToIndex(queueIndex! - 1, true) : null);
    set("nexttrack", canNext ? () => goToIndex(queueIndex! + 1, true) : null);
  }, [playing, trackTitle, label, queue, queueIndex, skip, seekTo, goToIndex]);

  const btn =
    "inline-flex items-center justify-center rounded-full border border-ink/15 bg-white/80 px-3 py-2 text-sm font-bold text-ink transition hover:bg-white focus-ring";

  // Offline download: Vercel Blob serves `?download=1` with Content-Disposition: attachment,
  // so a plain link saves the mp3 to the device (listen offline in the device's own player) —
  // no service-worker/Range machinery needed.
  const downloadHref = `${trackSrc}${trackSrc.includes("?") ? "&" : "?"}download=1`;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-panel sm:p-5" aria-label={`${label}: ${trackTitle}`}>
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={onPauseInternal}
        onEnded={onEndedInternal}
        onWaiting={onWaiting}
        onStalled={onWaiting}
        onPlaying={onPlaying}
        onCanPlay={clearBuffering}
        onError={onError}
      >
        <track kind="captions" src={trackCaptions} srcLang="en" label="English" default />
      </audio>

      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-paper transition focus-ring"
          style={{ backgroundColor: trackAccent }}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-blueprint">
            <span aria-hidden>{icon}</span>
            <span className="truncate">{trackTitle}</span>
            {playing && buffering && !errored ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink/50">
                <span aria-hidden className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink/60" />
                Buffering…
              </span>
            ) : null}
          </p>
          <p className="text-xs font-semibold text-ink/55">{subtitle} · {formatClock(duration)}</p>
        </div>
      </div>

      {errored ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-signal/40 bg-signal/10 p-3 text-sm">
          <span className="font-bold text-blueprint">Couldn&apos;t play this episode.</span>
          <button type="button" className={`${btn} border-signal/40`} onClick={retry}>
            <span aria-hidden>↻</span>&nbsp;Retry
          </button>
          {queue != null && queueIndex != null && queueIndex + 1 < queue.length ? (
            <button type="button" className={`${btn} border-signal/40`} onClick={skipToNext}>
              Skip to next <span aria-hidden>»</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="sr-only" htmlFor={`seek-${trackId}`}>Seek</label>
      <input
        id={`seek-${trackId}`}
        type="range"
        min={0}
        max={Math.floor(duration) || 0}
        value={Math.floor(current)}
        onChange={(e) => seekTo(Number(e.target.value))}
        className="mt-3 w-full accent-signal focus-ring"
        aria-label="Seek"
      />
      <div className="flex items-center justify-between text-xs font-semibold tabular-nums text-ink/55">
        <span>{formatClock(current)}</span>
        <span>{formatClock(duration)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => skip(-15)} aria-label="Back 15 seconds">« 15s</button>
        <button type="button" className={btn} onClick={() => skip(30)} aria-label="Forward 30 seconds">30s »</button>
        <button type="button" className={btn} onClick={cycleRate} aria-label={`Playback speed ${rate} times`}>
          {rate}×
        </button>
        <a
          className={btn}
          href={downloadHref}
          download
          aria-label={`Download ${trackTitle} audio for offline listening`}
        >
          <span aria-hidden>⬇</span>&nbsp;Download
        </a>
        {cues.length > 0 ? (
          <button type="button" className={btn} onClick={() => setShowTranscript((v) => !v)} aria-expanded={showTranscript}>
            {showTranscript ? "Hide transcript" : "Transcript"}
          </button>
        ) : null}
      </div>

      {showTranscript && cues.length > 0 ? (
        <ol className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-ink/10 bg-paper/50 p-4 text-sm leading-6">
          {cues.map((cue, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => seekTo(cue.start)}
                className="block w-full text-left text-ink/75 transition hover:text-signal focus-ring"
              >
                {cue.speaker ? (
                  <span className="font-bold" style={{ color: trackAccent }}>
                    {cue.speaker[0] + cue.speaker.slice(1).toLowerCase()}:{" "}
                  </span>
                ) : null}
                {cue.text}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
