// Audio pipeline · step 2 of 4 — text-to-speech.
//
// Renders each narration script (data/audio/scripts/<id>.txt) to an mp3 using
// Kokoro (kokoro-js / ONNX, fully local — no API, no per-use cost). Sentence-level
// timings are written alongside for the captions step. Content-hash gated: a script
// whose text is unchanged and already has an mp3 is skipped.
//
// Run:  node scripts/audio/synthesize.mjs [--force] [--only=<id>] [--voice=af_heart]
//
// First run downloads the ~300MB ONNX model from Hugging Face (cached after).
// Override the binary with FFMPEG=/path/to/ffmpeg if it isn't on PATH.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { KokoroTTS } from "kokoro-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SCRIPT_DIR = join(ROOT, "data", "audio", "scripts");
const OUT_DIR = join(ROOT, "build", "audio");

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const SAMPLE_RATE = 24000;
const INTER_SENTENCE_SILENCE = 0.12; // seconds of breathing room between sentences
const FFMPEG = process.env.FFMPEG || "ffmpeg";

const args = process.argv.slice(2);
const force = args.includes("--force");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length) || null;
const voice = (args.find((a) => a.startsWith("--voice=")) || "").slice("--voice=".length) || "af_heart";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

// Split narration into sentence units for stable synthesis and per-cue timings.
// Split by line first so the generator's block structure (e.g. "Section: X.") stays
// one cue; then split any multi-sentence line (linearized tables) on enders.
function toSentences(text) {
  const out = [];
  for (const line of text.split(/\n+/)) {
    if (!line.trim()) continue;
    for (const s of line.split(/(?<=[.!?])\s+/)) {
      const t = s.replace(/\s+/g, " ").trim();
      if (t) out.push(t);
    }
  }
  return out;
}

// Encode mono Float32 samples as a 16-bit PCM WAV buffer.
function floatToWav(samples, sampleRate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buffer;
}

mkdirSync(OUT_DIR, { recursive: true });

const ids = readdirSync(SCRIPT_DIR)
  .filter((f) => f.endsWith(".txt"))
  .map((f) => f.replace(/\.txt$/, ""))
  .filter((id) => !only || id === only);

if (!ids.length) {
  console.log(only ? `No script found for --only=${only}.` : "No scripts found. Run generate-scripts.mjs first.");
  process.exit(0);
}

console.log(`Loading Kokoro (${MODEL_ID}, voice=${voice})…`);
const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "cpu" });

let rendered = 0;
let skipped = 0;
for (const id of ids) {
  const scriptText = readFileSync(join(SCRIPT_DIR, `${id}.txt`), "utf8");
  const hash = sha256(`${voice}\n${scriptText}`);
  const mp3Path = join(OUT_DIR, `${id}.mp3`);
  const timingPath = join(OUT_DIR, `${id}.timing.json`);

  if (!force && existsSync(mp3Path) && existsSync(timingPath)) {
    const prev = JSON.parse(readFileSync(timingPath, "utf8"));
    if (prev.hash === hash) {
      skipped += 1;
      console.log(`skip   ${id} (unchanged)`);
      continue;
    }
  }

  const sentences = toSentences(scriptText);
  const chunks = [];
  const cues = [];
  let cursor = 0; // running sample count
  const silence = new Float32Array(Math.round(INTER_SENTENCE_SILENCE * SAMPLE_RATE));

  process.stdout.write(`render ${id} (${sentences.length} sentences) `);
  for (const sentence of sentences) {
    const audio = await tts.generate(sentence, { voice });
    const data = audio.audio; // Float32Array @ SAMPLE_RATE
    const start = cursor / SAMPLE_RATE;
    const end = (cursor + data.length) / SAMPLE_RATE;
    cues.push({ text: sentence, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)) });
    chunks.push(data, silence);
    cursor += data.length + silence.length;
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  // Concatenate all sentence samples into one track.
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const all = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) { all.set(c, offset); offset += c.length; }

  const wavPath = join(OUT_DIR, `${id}.wav`);
  writeFileSync(wavPath, floatToWav(all, SAMPLE_RATE));
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", wavPath, "-b:a", "128k", mp3Path]);

  const durationSec = Number((total / SAMPLE_RATE).toFixed(2));
  writeFileSync(timingPath, JSON.stringify({ id, voice, hash, durationSec, cues }, null, 2));
  console.log(`  wrote ${id}.mp3 (${durationSec}s)`);
  rendered += 1;
}

console.log(`\nDone. rendered=${rendered} skipped=${skipped}`);
