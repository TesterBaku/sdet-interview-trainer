import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Server-only audio metadata access (uses fs). Cheat-sheet pages and the Commute page
// are static (generateStaticParams / no dynamic segments), so these reads happen at build
// time and get baked into the output — the client AudioPlayer receives everything as props.

const AUDIO_DIR = join(process.cwd(), "data", "audio");

export type CheatSheetAudio = {
  id: string;
  mp3Url: string;
  vttUrl: string;
  durationSec: number;
};

export type TranscriptCue = { speaker?: string | null; text: string; start: number; end: number };

type ManifestEntry = { mp3Url: string; vttUrl: string; durationSec: number; voice?: string | null; hash: string };

// Dev staging (manifest.local.json, gitignored) wins when present and non-empty; otherwise
// the committed production manifest.json (populated by the Vercel Blob publish). Read via fs
// so a missing local manifest in CI/production just falls back — no build-time import of a
// gitignored file, and no audio surfaces until the production manifest is published.
function loadManifest(): Record<string, ManifestEntry> {
  for (const name of ["manifest.local.json", "manifest.json"]) {
    const path = join(AUDIO_DIR, name);
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8")) as Record<string, ManifestEntry>;
      if (Object.keys(parsed).length > 0) return parsed;
    } catch {
      // corrupt file — try the next candidate
    }
  }
  return {};
}

const manifest = loadManifest();

export function hasCheatSheetAudio(id: string): boolean {
  return Boolean(manifest[id]);
}

export function getCheatSheetAudio(id: string): CheatSheetAudio | null {
  const entry = manifest[id];
  if (!entry) return null;
  return { id, mp3Url: entry.mp3Url, vttUrl: entry.vttUrl, durationSec: entry.durationSec };
}

// Every episode that has audio, sorted by id (stable order for the Commute playlist).
export function getAllCheatSheetAudio(): CheatSheetAudio[] {
  return Object.keys(manifest)
    .sort()
    .map((id) => getCheatSheetAudio(id))
    .filter((a): a is CheatSheetAudio => a !== null);
}

export function getCheatSheetTranscriptCues(id: string): TranscriptCue[] {
  const path = join(AUDIO_DIR, "transcripts", `${id}.json`);
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { cues?: TranscriptCue[] };
    return parsed.cues ?? [];
  } catch {
    return [];
  }
}

// "13 min" for badges/cards.
export function formatAudioMinutes(durationSec: number): string {
  return `${Math.max(1, Math.round(durationSec / 60))} min`;
}
