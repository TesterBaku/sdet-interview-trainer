import type { TranscriptCue } from "@/lib/audio";

// Parse a WebVTT file into transcript cues. Client-safe (no fs) so the Commute player can fetch
// and parse an episode's already-published .vtt on demand — the cheat-sheet pages read cues from
// the JSON transcript server-side, but baking all 36 into the static Commute page would bloat it.
// The publish pipeline writes each cue's text as `<v SPEAKER>…`, mirroring the JSON cue shape.
export function parseVtt(text: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  for (const block of text.replace(/\r\n/g, "\n").split(/\n\n+/)) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    const timeIndex = lines.findIndex((l) => l.includes("-->"));
    if (timeIndex === -1) continue;

    const [rawStart, rawEnd] = lines[timeIndex]
      .split("-->")
      .map((s) => s.trim().split(/\s+/)[0]); // drop any cue settings after the end timestamp
    const start = parseTimestamp(rawStart);
    const end = parseTimestamp(rawEnd);
    if (start == null || end == null) continue;

    const body = lines.slice(timeIndex + 1).join(" ").trim();
    const voice = body.match(/^<v\s+([^>]+)>/i);
    const cleaned = body.replace(/<[^>]+>/g, "").trim(); // strip <v …> and any other tags
    if (cleaned) cues.push({ speaker: voice ? voice[1].trim() : null, text: cleaned, start, end });
  }
  return cues;
}

// WebVTT timestamps are HH:MM:SS.mmm or MM:SS.mmm.
function parseTimestamp(ts: string): number | null {
  if (!ts) return null;
  const parts = ts.split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => Number.isNaN(n))) return null;
  return parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + parts[1];
}
