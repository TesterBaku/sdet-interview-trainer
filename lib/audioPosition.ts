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

// A localStorage-backed store signals updates through a custom event; every such store here
// subscribes the same way (its own event + the cross-tab "storage" event), so share one factory.
function makeStoreSubscription(eventName: string) {
  return (onStoreChange: () => void): (() => void) => {
    window.addEventListener(eventName, onStoreChange);
    window.addEventListener("storage", onStoreChange);
    return () => {
      window.removeEventListener(eventName, onStoreChange);
      window.removeEventListener("storage", onStoreChange);
    };
  };
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

export const subscribeToAudioRate = makeStoreSubscription(AUDIO_RATE_CHANGE_EVENT);

// Commute progress (resume pointer + listened set) is read via useSyncExternalStore, so it
// needs a subscribable change signal — this avoids a setState-in-effect on mount (which the
// React lint rule forbids) and keeps the playlist in sync when a write happens. The snapshot
// is a monotonic version; -1 is the server/pre-hydration sentinel so the memo can stay empty
// until the client is live (no hydration mismatch against the localStorage-free server HTML).
const COMMUTE_PROGRESS_EVENT = "sdet-interview-trainer-commute-progress-change";
let commuteProgressVersion = 0;

function bumpCommuteProgress(): void {
  commuteProgressVersion += 1;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COMMUTE_PROGRESS_EVENT));
}

export function getCommuteProgressSnapshot(): number {
  return commuteProgressVersion;
}

export function getServerCommuteProgressSnapshot(): number {
  return -1;
}

export const subscribeToCommuteProgress = makeStoreSubscription(COMMUTE_PROGRESS_EVENT);

// "Where you were in the Commute queue" — the last lane + episode the listener actually
// played, so a multi-day, hours-long queue can be resumed. Only the pointer lives here; the
// exact second comes from the per-episode position above (`readAudioPosition`), so the two
// never drift. Written on an explicit play/advance, never on landing.
const COMMUTE_RESUME_KEY = "sdet-interview-trainer-commute-resume";

export type CommuteResume = { laneKey: string; episodeId: string };

export function readCommuteResume(): CommuteResume | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(COMMUTE_RESUME_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CommuteResume>;
    if (typeof parsed.laneKey === "string" && typeof parsed.episodeId === "string") {
      return { laneKey: parsed.laneKey, episodeId: parsed.episodeId };
    }
  } catch {
    // Corrupt value — treat as no saved resume point.
  }
  return null;
}

export function writeCommuteResume(resume: CommuteResume): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMMUTE_RESUME_KEY, JSON.stringify(resume));
  bumpCommuteProgress();
}

// Episodes finished to the end (recorded on `ended`). A flat set of position ids
// (`commute:{lane}:{id}`) so the playlist can dim/check what's already been heard.
const COMMUTE_COMPLETED_KEY = "sdet-interview-trainer-commute-completed";

export function readCompletedAudio(): string[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(COMMUTE_COMPLETED_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function markAudioCompleted(id: string): void {
  if (typeof window === "undefined") return;
  const done = readCompletedAudio();
  if (done.includes(id)) return;
  done.push(id);
  window.localStorage.setItem(COMMUTE_COMPLETED_KEY, JSON.stringify(done));
  bumpCommuteProgress();
}
