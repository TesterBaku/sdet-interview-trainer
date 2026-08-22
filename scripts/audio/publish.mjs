// Audio pipeline · step 4 of 4 — publish.
//
// Uploads the built mp3 + vtt for each cheat sheet to Cloudflare R2 and writes the
// COMMITTED manifest (data/audio/manifest.json) that the app reads to decide which
// sheets have audio and where to fetch it. Hash-gated: a sheet whose audio is
// unchanged (per the timing hash) is left as-is unless --force.
//
// Run:  node scripts/audio/publish.mjs [--force] [--only=<id>]   # creds from .env
//       node scripts/audio/publish.mjs --local   # dev: stage into public/audio, no upload
//
// --local copies files into public/audio/ (gitignored) and writes a SEPARATE
// gitignored manifest (manifest.local.json) with /audio/<id>.* URLs, so the player
// can be developed without R2 credentials while the committed manifest.json always
// holds production (R2) URLs.
//
// R2 rather than Vercel Blob: audio is bandwidth-heavy and Blob's Hobby tier caps data
// transfer at 10 GB/month, which this library blew through (every play re-downloads the
// full episode — nothing caches cross-origin media). R2 charges no egress at all, and a
// custom domain puts the episodes behind Cloudflare's CDN.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { KIND_NAMESPACES, kindFromArgs } from "./kinds.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// Load the gitignored .env so the R2 credentials can live there instead of on the command
// line. A real environment variable (e.g. an inline `R2_BUCKET=... npm run …`) still wins —
// loadEnvFile only fills what's unset.
if (!process.env.R2_ACCESS_KEY_ID && existsSync(join(ROOT, ".env"))) {
  process.loadEnvFile(join(ROOT, ".env"));
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const local = args.includes("--local");
// Kind selects the build namespace, object-key prefix, and manifest file. Interview uses a
// SEPARATE manifest + object prefix + transcript subdir + staging subdir because it shares
// cheat-sheet ids with the podcast — same id, different audio — so a shared manifest/path
// would clobber. All the per-kind paths live in kinds.mjs so the three pipeline scripts
// can't drift apart.
const ns = KIND_NAMESPACES[kindFromArgs(args)];
const OBJECT_PREFIX = ns.objectPrefix;
const manifestBase = ns.manifestBase;

const BUILD_DIR = join(ROOT, "build", "audio", ...ns.buildSubdir);
const PUBLIC_AUDIO_DIR = join(ROOT, "public", "audio", ...ns.publicSubdir);
const TRANSCRIPT_DIR = join(ROOT, "data", "audio", "transcripts", ...ns.transcriptSubdir);
const only = (args.find((a) => a.startsWith("--only=")) || "").slice("--only=".length) || null;

// Remote and local staging use independent manifests so a --local run can never write
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

// Episodes are content-addressed by the timing hash and only ever re-uploaded under the same
// key when that hash changes, so they're safe to cache hard at the edge. See the purge notice
// at the end of the run: overwriting an existing key needs a Cloudflare cache purge, because
// `immutable` tells the CDN never to revalidate.
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// The R2 S3 endpoint is keyed by the Cloudflare account id, which .env may already carry under
// its generic name — accept that rather than making the same value appear twice. The key pair
// is R2-specific though (Cloudflare → R2 → Manage API tokens): a CLOUDFLARE_API_TOKEN is a
// different credential and will not authenticate against the S3 API.
const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_VARS = ["R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE"];

// uploadObject(key, body, contentType, downloadName) → public URL. Null in --local mode.
let uploadObject = null;
if (!local) {
  const missing = R2_VARS.filter((v) => !process.env[v]);
  if (!accountId) missing.unshift("R2_ACCOUNT_ID (or CLOUDFLARE_ACCOUNT_ID)");
  if (missing.length) {
    console.error(
      `Missing R2 credentials: ${missing.join(", ")}.\n` +
        "Set them in .env (Cloudflare → R2 → Manage API tokens) or run with --local for dev staging."
    );
    process.exit(1);
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
  const bucket = process.env.R2_BUCKET;
  const publicBase = process.env.R2_PUBLIC_BASE.replace(/\/+$/, "");

  uploadObject = async (key, body, contentType, downloadName) => {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: CACHE_CONTROL,
        // Only the mp3 carries an attachment disposition, so the player's Download link saves
        // the file instead of navigating to it. R2 has no `?download=1` rewrite like Blob did,
        // and the HTML `download` attribute is ignored cross-origin, so this is what makes the
        // link work. Playback is unaffected — media elements ignore Content-Disposition.
        ...(downloadName ? { ContentDisposition: `attachment; filename="${downloadName}"` } : {}),
      })
    );
    return `${publicBase}/${key}`;
  };
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
// URLs re-uploaded over a key that was already live. They're served with `immutable`, so the
// CDN will keep handing out the old bytes until these are purged.
const overwritten = [];

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
    mp3Url = `/${OBJECT_PREFIX}/${id}.mp3`;
    vttUrl = `/${OBJECT_PREFIX}/${id}.vtt`;
  } else {
    [mp3Url, vttUrl] = await Promise.all([
      uploadObject(`${OBJECT_PREFIX}/${id}.mp3`, readFileSync(mp3Path), "audio/mpeg", `${id}.mp3`),
      uploadObject(`${OBJECT_PREFIX}/${id}.vtt`, readFileSync(vttPath), "text/vtt", null),
    ]);
    // An id that already had a manifest entry is an overwrite of a live, edge-cached key.
    if (existing) overwritten.push(mp3Url);
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

if (overwritten.length) {
  console.log(
    `\n⚠ ${overwritten.length} object(s) replaced an already-published key. They're served with\n` +
      `  "${CACHE_CONTROL}", so Cloudflare will keep serving the OLD audio until you purge:\n` +
      `  Cloudflare dashboard → your zone → Caching → Configuration → Purge Custom URLs\n` +
      overwritten.map((u) => `    ${u}`).join("\n")
  );
}
