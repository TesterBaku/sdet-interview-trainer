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
// --local copies files into public/audio/ (gitignored) and writes a SEPARATE
// gitignored manifest (manifest.local.json) with /audio/<id>.* URLs, so the player
// can be developed without Blob credentials while the committed manifest.json always
// holds production (Blob) URLs.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KIND_NAMESPACES, kindFromArgs } from "./kinds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// Load the gitignored .env so BLOB_READ_WRITE_TOKEN can live there instead of on the
// command line. A real environment variable (e.g. an inline `TOKEN=... npm run …`) still
// wins — loadEnvFile only fills what's unset.
if (!process.env.BLOB_READ_WRITE_TOKEN && existsSync(join(ROOT, ".env"))) {
  process.loadEnvFile(join(ROOT, ".env"));
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const local = args.includes("--local");
// Kind selects the build namespace, Blob path prefix, and manifest file. Interview uses a
// SEPARATE manifest + Blob prefix + transcript subdir + staging subdir because it shares
// cheat-sheet ids with the podcast — same id, different audio — so a shared manifest/path
// would clobber. All the per-kind paths live in kinds.mjs so the three pipeline scripts
// can't drift apart.
const ns = KIND_NAMESPACES[kindFromArgs(args)];
const BLOB_PREFIX = ns.blobPrefix;
const manifestBase = ns.manifestBase;

const BUILD_DIR = join(ROOT, "build", "audio", ...ns.buildSubdir);
const PUBLIC_AUDIO_DIR = join(ROOT, "public", "audio", ...ns.publicSubdir);
const TRANSCRIPT_DIR = join(ROOT, "data", "audio", "transcripts", ...ns.transcriptSubdir);
const only = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length) || null;

// Blob and local staging use independent manifests so a --local run can never write
// unreachable /audio/* URLs into the committed, production manifest.
const MANIFEST_PATH = join(ROOT, "data", "audio", local ? `${manifestBase}.local.json` : `${manifestBase}.json`);

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

// The build dir for a namespace only exists after its first synth run; guard so a publish
// before any render prints the friendly hint instead of an unhandled ENOENT from readdirSync.
if (!existsSync(BUILD_DIR)) {
  console.log("No built audio found. Run synthesize.mjs (+ captions.mjs) first.");
  process.exit(0);
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
  const mp3Path = join(BUILD_DIR, `${id}.mp3`);
  const vttPath = join(BUILD_DIR, `${id}.vtt`);
  const timingPath = join(BUILD_DIR, `${id}.timing.json`);
  const transcriptPath = join(TRANSCRIPT_DIR, `${id}.json`);

  if (!existsSync(vttPath) || !existsSync(timingPath) || !existsSync(transcriptPath)) {
    console.warn(`skip   ${id} (missing vtt/timing/transcript — run audio:captions)`);
    skipped += 1;
    continue;
  }

  const timing = JSON.parse(readFileSync(timingPath, "utf8"));
  const transcript = JSON.parse(readFileSync(transcriptPath, "utf8"));
  // Guard against a fresh mp3 paired with stale captions (audio:tts run without captions).
  if (transcript.hash !== timing.hash) {
    console.warn(`skip   ${id} (captions/transcript stale — re-run audio:captions)`);
    skipped += 1;
    continue;
  }

  const existing = manifest[id];
  if (!force && existing && existing.hash === timing.hash) {
    skipped += 1;
    console.log(`skip   ${id} (unchanged)`);
    continue;
  }

  let mp3Url;
  let vttUrl;
  if (local) {
    copyFileSync(mp3Path, join(PUBLIC_AUDIO_DIR, `${id}.mp3`));
    copyFileSync(vttPath, join(PUBLIC_AUDIO_DIR, `${id}.vtt`));
    mp3Url = `/${BLOB_PREFIX}/${id}.mp3`;
    vttUrl = `/${BLOB_PREFIX}/${id}.vtt`;
  } else {
    const [a, b] = await Promise.all([
      put(`${BLOB_PREFIX}/${id}.mp3`, readFileSync(mp3Path), { access: "public", contentType: "audio/mpeg", addRandomSuffix: false, allowOverwrite: true }),
      put(`${BLOB_PREFIX}/${id}.vtt`, readFileSync(vttPath), { access: "public", contentType: "text/vtt", addRandomSuffix: false, allowOverwrite: true }),
    ]);
    mp3Url = a.url;
    vttUrl = b.url;
  }

  manifest[id] = {
    mp3Url,
    vttUrl,
    durationSec: timing.durationSec,
    // two-voice episodes carry `voices` (a speaker→voice map); single-voice carry `voice`.
    voice: timing.voice ?? (timing.voices ? Object.values(timing.voices).join(" + ") : null),
    hash: timing.hash,
  };
  published += 1;
  console.log(`publish ${id} → ${mp3Url}`);
}

saveManifest(manifest);
console.log(`\nDone. published=${published} skipped=${skipped} → ${local ? `${manifestBase}.local.json` : `${manifestBase}.json`}`);
