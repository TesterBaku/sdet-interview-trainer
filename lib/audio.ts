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

// Dev staging (<base>.local.json, gitignored) wins when present and non-empty; otherwise
// the committed production <base>.json (populated by the Vercel Blob publish). Read via fs
// so a missing local manifest in CI/production just falls back — no build-time import of a
// gitignored file, and no audio surfaces until the production manifest is published.
// The podcast and the interview rounds use SEPARATE manifest files because they share
// cheat-sheet ids (same id, different audio).
function loadManifest(base: string): Record<string, ManifestEntry> {
  for (const name of [`${base}.local.json`, `${base}.json`]) {
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

// The interview manifest basename + transcript subdir mirror scripts/audio/kinds.mjs
// (KIND_NAMESPACES.interview.manifestBase / .transcriptSubdir). This app read can't import
// that .mjs cleanly from the typed bundle, so the two strings are kept in sync by hand —
// if you rename the interview namespace there, update here (this line + the cues path below).
const manifest = loadManifest("manifest");
const interviewManifest = loadManifest("manifest.interview");

// Shared readers over either manifest — the podcast and interview lanes have identical
// shape and differ only by which manifest they read, so both go through these.
function audioFromManifest(m: Record<string, ManifestEntry>, id: string): CheatSheetAudio | null {
  const entry = m[id];
  if (!entry) return null;
  return { id, mp3Url: entry.mp3Url, vttUrl: entry.vttUrl, durationSec: entry.durationSec };
}

// Every entry in a manifest, sorted by id (stable order for the Commute playlist/lane).
function allAudioFromManifest(m: Record<string, ManifestEntry>): CheatSheetAudio[] {
  return Object.keys(m)
    .sort()
    .map((id) => audioFromManifest(m, id))
    .filter((a): a is CheatSheetAudio => a !== null);
}

export function hasCheatSheetAudio(id: string): boolean {
  return Boolean(manifest[id]);
}

export function getCheatSheetAudio(id: string): CheatSheetAudio | null {
  return audioFromManifest(manifest, id);
}

export function getAllCheatSheetAudio(): CheatSheetAudio[] {
  return allAudioFromManifest(manifest);
}

export function getCheatSheetTranscriptCues(id: string): TranscriptCue[] {
  return readTranscriptCues(join(AUDIO_DIR, "transcripts", `${id}.json`));
}

// --- Mock-interview rounds (two-voice INTERVIEWER/CANDIDATE audio) -----------------------
// Same shape as cheat-sheet audio but keyed off the separate interview manifest + the
// transcripts/interview/ namespace, so a topic can carry both a podcast episode and an
// interview round without the two colliding.

export type InterviewAudio = CheatSheetAudio;

export function getInterviewAudio(id: string): InterviewAudio | null {
  return audioFromManifest(interviewManifest, id);
}

// Every topic that has an interview round, sorted by id (stable order for the Commute lane).
export function getAllInterviewAudio(): InterviewAudio[] {
  return allAudioFromManifest(interviewManifest);
}

export function getInterviewTranscriptCues(id: string): TranscriptCue[] {
  return readTranscriptCues(join(AUDIO_DIR, "transcripts", "interview", `${id}.json`));
}

function readTranscriptCues(path: string): TranscriptCue[] {
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { cues?: TranscriptCue[] };
    return parsed.cues ?? [];
  } catch {
    return [];
  }
}
