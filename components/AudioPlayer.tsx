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

type AudioPlayerProps = {
  id: string;
  title: string;
  src: string;
  captionsSrc: string;
  durationSec: number;
  cues?: TranscriptCue[];
  accent?: string;
  autoPlay?: boolean;
  // Accessible-name prefix + visible descriptor + icon, so a page can host more than one
  // player (e.g. a podcast episode and a mock-interview round) with distinct labels.
  label?: string;
  subtitle?: string;
  icon?: string;
  // Resume from the saved position on mount. Off for the Commute playlist, where each
  // episode should start from the beginning as it's queued.
  resume?: boolean;
  onEnded?: () => void;
};

const RATES = [1, 1.25, 1.5, 2] as const;
type Rate = (typeof RATES)[number];

export function AudioPlayer({
  id,
  title,
  src,
  captionsSrc,
  durationSec,
  cues = [],
  accent = "#17324d",
  autoPlay = false,
  label = "Listen",
  subtitle = "Two-host episode",
  icon = "🎧",
  resume = true,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSavedSecond = useRef(-1);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [showTranscript, setShowTranscript] = useState(false);
  // Speed is a persisted global preference read via an external store (hydration-safe;
  // server snapshot is always 1, so no SSR mismatch), which also survives remounts.
  const rate = useSyncExternalStore(subscribeToAudioRate, readAudioRate, getServerAudioRate);

  // Apply the current speed to the element whenever it changes.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || durationSec);
    audio.playbackRate = rate;
    if (!resume) return;
    const saved = readAudioPosition(id);
    if (saved > 0 && saved < (audio.duration || durationSec) - 2) {
      audio.currentTime = saved;
      setCurrent(saved);
    }
  }, [id, durationSec, resume, rate]);

  // Persist position at most once per whole second (timeupdate fires ~4×/sec).
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    const whole = Math.floor(audio.currentTime);
    if (whole > 0 && whole !== lastSavedSecond.current) {
      lastSavedSecond.current = whole;
      writeAudioPosition(id, whole);
    }
  }, [id]);

  const onEndedInternal = useCallback(() => {
    clearAudioPosition(id);
    lastSavedSecond.current = -1;
    setPlaying(false);
    onEnded?.();
  }, [id, onEnded]);

  // Play state is driven by the element's own play/pause events (below), so a blocked
  // play() never leaves the icon out of sync.
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => undefined);
    else audio.pause();
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const next = Math.min(Math.max(0, audio.currentTime + delta), audio.duration || duration);
      audio.currentTime = next;
      setCurrent(next);
    },
    [duration],
  );

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrent(seconds);
  }, []);

  const cycleRate = useCallback(() => {
    const currentIndex = RATES.indexOf(rate as Rate); // -1 (unknown stored value) → next is RATES[0]
    writeAudioRate(RATES[(currentIndex + 1) % RATES.length]);
  }, [rate]);

  const btn =
    "inline-flex items-center justify-center rounded-full border border-ink/15 bg-white/80 px-3 py-2 text-sm font-bold text-ink transition hover:bg-white focus-ring";

  // Offline download: Vercel Blob serves `?download=1` with Content-Disposition: attachment,
  // so a plain link saves the mp3 to the device (listen offline in the device's own player) —
  // no service-worker/Range machinery needed.
  const downloadHref = `${src}${src.includes("?") ? "&" : "?"}download=1`;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-panel sm:p-5" aria-label={`${label}: ${title}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        autoPlay={autoPlay}
        onLoadedMetadata={onLoadedMetadata}
        onTimeUpdate={onTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEndedInternal}
      >
        <track kind="captions" src={captionsSrc} srcLang="en" label="English" default />
      </audio>

      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-black text-paper transition focus-ring"
          style={{ backgroundColor: accent }}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-blueprint">
            <span aria-hidden>{icon}</span>
            <span className="truncate">{title}</span>
          </p>
          <p className="text-xs font-semibold text-ink/55">{subtitle} · {formatClock(duration)}</p>
        </div>
      </div>

      <label className="sr-only" htmlFor={`seek-${id}`}>Seek</label>
      <input
        id={`seek-${id}`}
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
          aria-label={`Download ${title} audio for offline listening`}
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
                  <span className="font-bold" style={{ color: accent }}>
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
