// Audio pipeline · step 4 of 4 — publish.
//
// Uploads the built mp3 + vtt for each cheat sheet to Vercel Blob and writes the
// COMMITTED manifest (data/audio/manifest.json) that the app reads to decide which
// sheets have audio and where to fetch it. Hash-gated: a sheet whose audio is
// unchanged (per the timing hash) is left as-is unless --force.
//
// Run:  BLOB_READ_WRITE_TOKEN=... node scripts/audio/publish.mjs [--force] [--only=<id>]
//       node scripts/audio/publish.mjs --local   # dev: stage into public/audio, no Blob
//
// --local copies files into public/audio/ (gitignored) and writes /audio/<id>.* URLs,
// so the player can be developed/tested without Blob credentials. Production uses Blob.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const BUILD_DIR = join(ROOT, "build", "audio");
const PUBLIC_AUDIO_DIR = join(ROOT, "public", "audio");
const MANIFEST_PATH = join(ROOT, "data", "audio", "manifest.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const local = args.includes("--local");
const only = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length) || null;

function loadManifest() {
  return existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) : {};
}

// Deterministic sort so the committed manifest diffs cleanly.
function saveManifest(manifest) {
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  writeFileSync(MANIFEST_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

let put = null;
if (!local) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "Missing BLOB_READ_WRITE_TOKEN. Set it (Vercel → Storage → Blob → tokens) or run with --local for dev staging."
    );
    process.exit(1);
  }
  ({ put } = await import("@vercel/blob"));
}

const ids = readdirSync(BUILD_DIR)
  .filter((f) => f.endsWith(".mp3"))
  .map((f) => f.replace(/\.mp3$/, ""))
  .filter((id) => !only || id === only);

if (!ids.length) {
  console.log("No built audio found. Run synthesize.mjs (+ captions.mjs) first.");
  process.exit(0);
}

if (local) mkdirSync(PUBLIC_AUDIO_DIR, { recursive: true });

const manifest = loadManifest();
let published = 0;
let skipped = 0;

for (const id of ids) {
  const timing = JSON.parse(readFileSync(join(BUILD_DIR, `${id}.timing.json`), "utf8"));
  const existing = manifest[id];
  if (!force && existing && existing.hash === timing.hash && existing.mode === (local ? "local" : "blob")) {
    skipped += 1;
    console.log(`skip   ${id} (unchanged)`);
    continue;
  }

  const mp3 = readFileSync(join(BUILD_DIR, `${id}.mp3`));
  const vtt = readFileSync(join(BUILD_DIR, `${id}.vtt`));
  let mp3Url;
  let vttUrl;

  if (local) {
    copyFileSync(join(BUILD_DIR, `${id}.mp3`), join(PUBLIC_AUDIO_DIR, `${id}.mp3`));
    copyFileSync(join(BUILD_DIR, `${id}.vtt`), join(PUBLIC_AUDIO_DIR, `${id}.vtt`));
    mp3Url = `/audio/${id}.mp3`;
    vttUrl = `/audio/${id}.vtt`;
  } else {
    const a = await put(`audio/${id}.mp3`, mp3, { access: "public", contentType: "audio/mpeg", addRandomSuffix: false, allowOverwrite: true });
    const b = await put(`audio/${id}.vtt`, vtt, { access: "public", contentType: "text/vtt", addRandomSuffix: false, allowOverwrite: true });
    mp3Url = a.url;
    vttUrl = b.url;
  }

  manifest[id] = {
    mp3Url,
    vttUrl,
    durationSec: timing.durationSec,
    voice: timing.voice,
    hash: timing.hash,
    mode: local ? "local" : "blob",
  };
  published += 1;
  console.log(`publish ${id} → ${mp3Url}`);
}

saveManifest(manifest);
console.log(`\nDone. published=${published} skipped=${skipped} → data/audio/manifest.json`);
