"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clearAudioPosition, readAudioPosition, writeAudioPosition } from "@/lib/audioPosition";
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
  onEnded?: () => void;
};

const RATES = [1, 1.25, 1.5, 2] as const;

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function AudioPlayer({
  id,
  title,
  src,
  captionsSrc,
  durationSec,
  cues = [],
  accent = "#17324d",
  autoPlay = false,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(durationSec);
  const [rate, setRate] = useState<(typeof RATES)[number]>(1);
  const [showTranscript, setShowTranscript] = useState(false);

  // Resume from the saved position once metadata is available (read in an effect, never
  // during render, to stay hydration-safe).
  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration || durationSec);
    const saved = readAudioPosition(id);
    if (saved > 0 && saved < (audio.duration || durationSec) - 2) {
      audio.currentTime = saved;
      setCurrent(saved);
    }
  }, [id, durationSec]);

  // Persist position as it plays (throttled to whole seconds by the store).
  const onTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(audio.currentTime);
    if (audio.currentTime > 0) writeAudioPosition(id, audio.currentTime);
  }, [id]);

  const onEndedInternal = useCallback(() => {
    clearAudioPosition(id);
    setPlaying(false);
    onEnded?.();
  }, [id, onEnded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = rate;
  }, [rate]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  const skip = useCallback((delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), audio.duration || duration);
  }, [duration]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setCurrent(seconds);
  }, []);

  const cycleRate = useCallback(() => {
    setRate((r) => RATES[(RATES.indexOf(r) + 1) % RATES.length]);
  }, []);

  const btn =
    "inline-flex items-center justify-center rounded-full border border-ink/15 bg-white/80 px-3 py-2 text-sm font-bold text-ink transition hover:bg-white focus-ring";

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/80 p-4 shadow-panel sm:p-5" aria-label={`Listen: ${title}`}>
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
            <span aria-hidden>🎧</span>
            <span className="truncate">{title}</span>
          </p>
          <p className="text-xs font-semibold text-ink/55">Two-host episode · {clock(duration)}</p>
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
        <span>{clock(current)}</span>
        <span>{clock(duration)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={btn} onClick={() => skip(-15)} aria-label="Back 15 seconds">« 15s</button>
        <button type="button" className={btn} onClick={() => skip(30)} aria-label="Forward 30 seconds">30s »</button>
        <button type="button" className={btn} onClick={cycleRate} aria-label={`Playback speed ${rate} times`}>
          {rate}×
        </button>
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
