// Audio pipeline · step 3 of 4 — transcripts + captions.
//
// Consumes the per-sentence timings from synthesize (build/audio/<id>.timing.json)
// and emits two artifacts:
//   • data/audio/transcripts/<id>.json  — COMMITTED; rendered on the page for
//     accessibility + SEO and used as the on-page transcript.
//   • build/audio/<id>.vtt              — WebVTT captions uploaded alongside the
//     mp3 (the <track> source); not committed (lives in build/, goes to Blob).
//
// Run:  node scripts/audio/captions.mjs [--only=<id>]

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const BUILD_DIR = join(ROOT, "build", "audio");
const TRANSCRIPT_DIR = join(ROOT, "data", "audio", "transcripts");

const only = (process.argv.slice(2).find((a) => a.startsWith("--only=")) || "").slice("--only=".length) || null;

const pad = (n, w = 2) => String(n).padStart(w, "0");
function vttTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

function toVtt(cues) {
  const blocks = cues.map(
    (c, i) => `${i + 1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}`
  );
  return `WEBVTT\n\n${blocks.join("\n\n")}\n`;
}

mkdirSync(TRANSCRIPT_DIR, { recursive: true });

const timings = readdirSync(BUILD_DIR)
  .filter((f) => f.endsWith(".timing.json"))
  .map((f) => f.replace(/\.timing\.json$/, ""))
  .filter((id) => !only || id === only);

if (!timings.length) {
  console.log("No timing files found. Run synthesize.mjs first.");
  process.exit(0);
}

let count = 0;
for (const id of timings) {
  const timing = JSON.parse(readFileSync(join(BUILD_DIR, `${id}.timing.json`), "utf8"));

  writeFileSync(join(BUILD_DIR, `${id}.vtt`), toVtt(timing.cues), "utf8");
  writeFileSync(
    join(TRANSCRIPT_DIR, `${id}.json`),
    JSON.stringify(
      { id, voice: timing.voice, durationSec: timing.durationSec, cues: timing.cues },
      null,
      2
    ) + "\n",
    "utf8"
  );
  count += 1;
  console.log(`captions ${id}  (${timing.cues.length} cues, ${timing.durationSec}s)`);
}

console.log(`\nDone. wrote ${count} transcript(s) + vtt.`);
