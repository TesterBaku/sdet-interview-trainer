// Audio pipeline (two-voice) — dialogue synthesis for podcast + mock-interview formats.
//
// Renders a speaker-labeled dialogue script to a single mp3, switching the Kokoro voice
// per speaker turn and stitching the turns with short breaths. Reuses the pronunciation
// lexicon + ffmpeg encode from the single-voice path (synthesize.mjs); the committed
// transcript keeps the real words.
//
// Two "kinds" share this one path (see KINDS below), each with its own source dir,
// build namespace, and default speaker→voice map:
//   • podcast   — data/audio/podcast/<id>.txt   → build/audio/podcast/   (MAYA + LEO)
//   • interview — data/audio/interview/<id>.txt → build/audio/interview/ (INTERVIEWER + CANDIDATE)
//
// Each kind renders into its OWN build namespace, separate from the single-voice
// pipeline's build/audio/, so the formats never overwrite each other and captions.mjs
// (which scans a dir non-recursively) only picks up the timings it was pointed at.
//
// Run:
//   node scripts/audio/synthesize-podcast.mjs [--kind=podcast] [--id=api-testing]
//        [--<speaker>=<voice>] [--limit=N] [--suffix=name] [--force]
//
//   --kind=k    podcast (default) or interview — selects source dir + default voices
//   --<speaker> override one speaker's voice, e.g. --leo=am_fenrir or --interviewer=am_puck
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
const LEXICON_PATH = join(ROOT, "data", "audio", "lexicon.json");

// Each kind is a self-contained format: where its scripts live, where its renders go, and
// the default speaker→Kokoro-voice map. Interview reuses the podcast's two voices but SWAPS
// their roles — the male (am_fenrir) asks, the warm female (af_heart) answers — inverting the
// podcast's female-mentor / male-learner dynamic. Same timbres; the formats are set apart by
// structure (Q&A vs conversation) and role, not by a distinct third/fourth voice.
const KINDS = {
  podcast: {
    srcDir: join(ROOT, "data", "audio", "podcast"),
    outDir: join(ROOT, "build", "audio", "podcast"),
    voices: { MAYA: "af_heart", LEO: "am_michael" },
  },
  interview: {
    srcDir: join(ROOT, "data", "audio", "interview"),
    outDir: join(ROOT, "build", "audio", "interview"),
    voices: { INTERVIEWER: "am_fenrir", CANDIDATE: "af_heart" },
  },
};

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

// Kind can be given as --kind=<k> or, matching captions.mjs / publish.mjs, a bare
// --interview / --podcast flag. The bare flag wins so `--interview` alone is unambiguous
// and can't be silently ignored (which would render podcast into the wrong namespace).
const kind = args.includes("--interview")
  ? "interview"
  : args.includes("--podcast")
    ? "podcast"
    : getArg("kind", "podcast");
const cfg = KINDS[kind];
if (!cfg) {
  console.error(`Unknown --kind=${kind}. Known: ${Object.keys(KINDS).join(", ")}`);
  process.exit(1);
}
const PODCAST_DIR = cfg.srcDir;
const OUT_DIR = cfg.outDir;

// Speaker → Kokoro voice, from the kind's defaults, each overridable via --<speaker>=voice
// (e.g. --leo=am_fenrir, --interviewer=am_puck).
const VOICES = Object.fromEntries(
  Object.entries(cfg.voices).map(([spk, def]) => [spk, getArg(spk.toLowerCase(), def)]),
);

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

mkdirSync(OUT_DIR, { recursive: true });

const scriptPath = join(PODCAST_DIR, `${id}.txt`);
if (!existsSync(scriptPath)) {
  console.error(`No podcast script at ${scriptPath}`);
  process.exit(1);
}

// Scope turn boundaries to this kind's known speakers, so a continuation line that opens
// with an acronym+colon (e.g. a candidate answer starting "TDD: ...") is read as prose, not
// mistaken for a phantom speaker that would trip the unknown-speaker guard below.
let turns = parseDialogue(readFileSync(scriptPath, "utf8"), Object.keys(VOICES));
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
