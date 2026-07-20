"use client";

// Per-episode "resume where you paused" position, in whole seconds. Keyed localStorage,
// mirroring the codeWorkspace/storage patterns; SSR-guarded so it's safe to call from
// effects during hydration.

const AUDIO_POSITION_PREFIX = "sdet-interview-trainer-audio-position:";

export function readAudioPosition(id: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(`${AUDIO_POSITION_PREFIX}${id}`);
  const seconds = raw ? Number(raw) : 0;
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

export function writeAudioPosition(id: string, seconds: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`${AUDIO_POSITION_PREFIX}${id}`, String(Math.floor(seconds)));
}

export function clearAudioPosition(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${AUDIO_POSITION_PREFIX}${id}`);
}
