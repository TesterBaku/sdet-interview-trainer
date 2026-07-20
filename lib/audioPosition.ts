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

// Playback speed is a single global preference (not per-episode), so it survives the
// player remounting when you switch episodes in the Commute playlist. Exposed as a
// subscribable store so components can read it via useSyncExternalStore (hydration-safe:
// the server snapshot is always 1).
const AUDIO_RATE_KEY = "sdet-interview-trainer-audio-rate";
const AUDIO_RATE_CHANGE_EVENT = "sdet-interview-trainer-audio-rate-change";

export function readAudioRate(): number {
  if (typeof window === "undefined") return 1;
  const raw = Number(window.localStorage.getItem(AUDIO_RATE_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 1;
}

export function getServerAudioRate(): number {
  return 1;
}

export function writeAudioRate(rate: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUDIO_RATE_KEY, String(rate));
  window.dispatchEvent(new Event(AUDIO_RATE_CHANGE_EVENT));
}

export function subscribeToAudioRate(onStoreChange: () => void): () => void {
  window.addEventListener(AUDIO_RATE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(AUDIO_RATE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
