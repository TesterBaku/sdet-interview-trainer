// Audio pipeline (podcast) — two-voice dialogue synthesis.
//
// Renders a speaker-labeled dialogue script (data/audio/podcast/<id>.txt) to a
// single mp3, switching the Kokoro voice per speaker turn and stitching the turns
// with short breaths. Reuses the pronunciation lexicon + ffmpeg encode from the
// single-voice path (synthesize.mjs); the committed transcript keeps the real words.
//
// Output (mp3 + per-speaker timing) lands in build/audio/podcast/<name>.* — a
// separate namespace from the single-voice pipeline's build/audio/, so the two never
// overwrite each other and captions.mjs (which scans build/audio/ non-recursively)
// does not pick up podcast timings.
//
// Run:
//   node scripts/audio/synthesize-podcast.mjs [--id=api-testing]
//        [--maya=af_heart] [--leo=am_michael] [--limit=N] [--suffix=name] [--force]
//
//   --limit=N   render only the first N turns (quick voice A/B clips)
//   --suffix=s  append ".s" to the output name (so A/B clips don't clobber)
//   --force     re-render even if the content-hash matches an existing render
//
// Renders are content-hash gated on the spoken (lexicon-applied) dialogue + voices, so
// re-running skips unchanged episodes; a script or lexicon edit re-renders.
//
// The first render of a given voice downloads its ~1MB voice pack from Hugging Face
// (cached after). Run online once per new voice; HF_HUB_OFFLINE=1 works thereafter.
// Override the binary with FFMPEG=/path/to/ffmpeg if it isn't on PATH.

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { KokoroTTS } from "kokoro-js";
import { applyLexicon, normalizeText, parseDialogue, splitSentences } from "./text.mjs";
import { floatToWav } from "./wav.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const PODCAST_DIR = join(ROOT, "data", "audio", "podcast");
const OUT_DIR = join(ROOT, "build", "audio", "podcast");
const LEXICON_PATH = join(ROOT, "data", "audio", "lexicon.json");

const lexicon = JSON.parse(readFileSync(LEXICON_PATH, "utf8")).terms;

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const SAMPLE_RATE = 24000;
const INTER_SENTENCE_SILENCE = 0.14; // breath between sentences within a turn
const INTER_TURN_SILENCE = 0.4; // longer beat when the speaker changes
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const args = process.argv.slice(2);
const getArg = (k, d) => {
  const hit = args.find((a) => a.startsWith(`--${k}=`));
  return hit === undefined ? d : hit.slice(k.length + 3);
};
const id = getArg("id", "api-testing");
const suffix = getArg("suffix", "");
const force = args.includes("--force");
// Only a positive limit trims turns; a zero/negative value renders the whole episode
// (a negative slice would otherwise silently drop turns from the END).
const limit = Number(getArg("limit", "0")) || 0;

// Speaker → Kokoro voice. Maya = warm female (grade A); Leo = male (overridable for A/B).
const VOICES = {
  MAYA: getArg("maya", "af_heart"),
  LEO: getArg("leo", "am_michael"),
};

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

mkdirSync(OUT_DIR, { recursive: true });

const scriptPath = join(PODCAST_DIR, `${id}.txt`);
if (!existsSync(scriptPath)) {
  console.error(`No podcast script at ${scriptPath}`);
  process.exit(1);
}

let turns = parseDialogue(readFileSync(scriptPath, "utf8"));
if (!turns.length) {
  console.error(`No speaker turns parsed from ${scriptPath}.`);
  process.exit(1);
}

const unknown = [...new Set(turns.map((t) => t.speaker))].filter((s) => !VOICES[s]);
if (unknown.length) {
  console.error(`No voice mapped for speaker(s): ${unknown.join(", ")}. Known: ${Object.keys(VOICES).join(", ")}`);
  process.exit(1);
}

if (limit > 0) turns = turns.slice(0, limit);
const outName = `${id}${suffix ? "." + suffix : ""}`;
const mp3Path = join(OUT_DIR, `${outName}.mp3`);
const timingPath = join(OUT_DIR, `${outName}.timing.json`);

// Content-hash gate: hash the voices + the exact spoken (lexicon-applied) text of each
// turn, so a script edit, a lexicon change, or a voice swap re-renders, but a repeat run
// is skipped before the costly model load. Mirrors the per-sentence transform used below.
const spokenScript = turns
  .map((t) => `${t.speaker}: ${splitSentences(t.text).map((s) => applyLexicon(normalizeText(s), lexicon)).join(" ")}`)
  .join("\n");
const hash = sha256(`${JSON.stringify(VOICES)}\n${spokenScript}`);

if (!force && existsSync(mp3Path) && existsSync(timingPath)) {
  const prev = JSON.parse(readFileSync(timingPath, "utf8"));
  if (prev.hash === hash) {
    console.log(`skip ${outName} (unchanged; --force to re-render)`);
    process.exit(0);
  }
}

console.log(
  `Loading Kokoro (${MODEL_ID})… voices: ${Object.entries(VOICES).map(([k, v]) => `${k}=${v}`).join(", ")}`,
);
const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "cpu" });

const chunks = [];
const cues = [];
let cursor = 0; // running sample count
const interSentence = new Float32Array(Math.round(INTER_SENTENCE_SILENCE * SAMPLE_RATE));
const interTurn = new Float32Array(Math.round(INTER_TURN_SILENCE * SAMPLE_RATE));

process.stdout.write(`render ${outName} (${turns.length} turns) `);
for (const turn of turns) {
  const voice = VOICES[turn.speaker];
  for (const sentence of splitSentences(turn.text)) {
    // Speak the normalized + lexicon-adjusted text; caption with the readable words.
    const spoken = applyLexicon(normalizeText(sentence), lexicon);
    const audio = await tts.generate(spoken, { voice });
    const data = audio.audio; // Float32Array @ SAMPLE_RATE
    const start = cursor / SAMPLE_RATE;
    const end = (cursor + data.length) / SAMPLE_RATE;
    cues.push({ speaker: turn.speaker, text: sentence, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)) });
    chunks.push(data, interSentence);
    cursor += data.length + interSentence.length;
    process.stdout.write(".");
  }
  chunks.push(interTurn); // extra beat between speakers
  cursor += interTurn.length;
}
process.stdout.write("\n");

const total = chunks.reduce((n, c) => n + c.length, 0);
const all = new Float32Array(total);
let offset = 0;
for (const c of chunks) {
  all.set(c, offset);
  offset += c.length;
}

const wavPath = join(OUT_DIR, `${outName}.wav`);
writeFileSync(wavPath, floatToWav(all, SAMPLE_RATE));
execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", wavPath, "-b:a", "128k", mp3Path]);
rmSync(wavPath, { force: true }); // drop the ~10x-larger intermediate WAV

const durationSec = Number((total / SAMPLE_RATE).toFixed(2));
writeFileSync(timingPath, JSON.stringify({ id, voices: VOICES, hash, durationSec, cues }, null, 2));
console.log(`  wrote ${outName}.mp3 (${durationSec}s, ${cues.length} cues)`);
