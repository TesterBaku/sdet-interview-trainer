// Pure, client-safe audio formatting helpers (no fs — usable from client components,
// unlike lib/audio.ts which reads the manifest off disk).

export function formatAudioMinutes(durationSec: number): string {
  return `${Math.max(1, Math.round(durationSec / 60))} min`;
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// A whole-lane running time, e.g. "4 h 20 m" (or "45 m" under an hour), for planning a commute.
export function formatAudioTotal(totalSec: number): string {
  const mins = Math.round(totalSec / 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} h ${m} m` : `${m} m`;
}
