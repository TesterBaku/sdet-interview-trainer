# Audio pipeline — self-owned narration for the cheat sheets

Turns the app's own cheat-sheet content into narrated audio + transcripts, generated
**fully offline** (local neural TTS, no third-party API, no per-use cost) and hosted on
our own Vercel Blob. This replaced a NotebookLM experiment whose Google-licensed audio
was a black box we couldn't patch, transcribe, or keep in sync with the content.

## How it fits together

```
data/cheatsheets/<id>.json
        │  1. generate-scripts   (HTML → spoken text: code dropped, tables linearized)
        ▼
data/audio/scripts/<id>.txt          ← COMMITTED · human-editable · REAL words
        │  2. synthesize         (lexicon → Kokoro TTS → wav → mp3, sentence timings)
        ▼
build/audio/<id>.mp3 + .timing.json  ← gitignored working dir
        │  3. captions          (timings → transcript + WebVTT)
        ▼
data/audio/transcripts/<id>.json  (COMMITTED)   build/audio/<id>.vtt
        │  4. publish            (upload mp3 + vtt to Vercel Blob)
        ▼
data/audio/manifest.json          ← COMMITTED · id → { mp3Url, vttUrl, durationSec, … }
```

The app reads `manifest.json` to decide which sheets have audio and where to fetch it,
and renders `transcripts/<id>.json` on the page for accessibility + SEO.

## Prerequisites

- Node (repo's version) and **ffmpeg** on `PATH` (or set `FFMPEG=/path/to/ffmpeg`).
- First `audio:tts` run downloads the ~300 MB Kokoro ONNX model from Hugging Face
  (`onnx-community/Kokoro-82M-v1.0-ONNX`), cached under `~/.cache/huggingface` after.
- For publishing: a Vercel Blob token in `BLOB_READ_WRITE_TOKEN`
  (Vercel → Storage → Blob → tokens).

## Everyday commands

```bash
npm run audio:scripts     # (re)generate narration scripts for new sheets
npm run audio:build       # scripts → tts → captions (produces local mp3 + transcripts)
npm run audio:publish     # upload changed audio to Blob, update manifest   (needs token)
npm run test:unit         # unit tests for the text transforms
```

Each step takes `--only=<id>` to target one sheet and `--force` to ignore the
content-hash gate. `synthesize` also takes `--voice=<name>` (default `af_heart`).

### Typical authoring loop

1. `npm run audio:scripts` — creates `data/audio/scripts/<id>.txt` for any new sheet.
   Existing scripts are **preserved** (hand edits survive); use `--force` to overwrite.
2. **Read the script.** It's the source of truth — fix wording, add pauses (sentence
   breaks), or drop anything that doesn't work in audio. The script keeps **real words**
   (SQL, JSON, API) — pronunciation is handled separately by `data/audio/lexicon.json`,
   which is applied only to the TTS input at synthesis, so transcripts/captions stay
   readable. Tweak the lexicon (e.g. `SQL → "sequel"`) and re-run `audio:tts`.
3. `npm run audio:build` — synthesize + captions. Listen to `build/audio/<id>.mp3`.
4. `npm run audio:publish` — upload to Blob and update the manifest.
5. Commit the changed `scripts/`, `transcripts/`, and `manifest.json`.

### Developing the player without Blob

`node scripts/audio/publish.mjs --local` stages the built mp3/vtt into
`public/audio/` (gitignored) and writes `/audio/<id>.*` URLs into a **separate**
gitignored `data/audio/manifest.local.json`, so the UI can be built and tested with no
Blob credentials. The committed `manifest.json` always holds production (Blob) URLs; a
`--local` run can never pollute it. (The app prefers `manifest.local.json` when present.)

## What's committed vs generated

| Committed (in git)                    | Generated / gitignored                 |
| ------------------------------------- | -------------------------------------- |
| `scripts/audio/*.mjs` (the pipeline)  | `build/audio/*` (wav, mp3, vtt, timing)|
| `data/audio/lexicon.json`             | `public/audio/*` (`--local` staging)   |
| `data/audio/scripts/*.txt`            | the Kokoro model cache                 |
| `data/audio/transcripts/*.json`       | `data/audio/manifest.local.json` (dev) |
| `data/audio/manifest.json`            | audio binaries live in Vercel Blob     |

## Troubleshooting

- **`fetch failed` / `ECONNRESET` on first `audio:tts`** — the transformers.js download
  has no resume and can trip on a flaky connection. Pre-fetch with the resumable
  Hugging Face downloader, then re-run (transformers.js reads the same cache):
  ```bash
  python -c "from huggingface_hub import snapshot_download; snapshot_download('onnx-community/Kokoro-82M-v1.0-ONNX', allow_patterns=['config.json','tokenizer*.json','*.txt','onnx/model_quantized.onnx','voices/af_heart.bin'])"
  HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 npm run audio:tts
  ```
- **A term is mispronounced** — add it to `data/audio/lexicon.json` and re-run synthesis
  (the lexicon affects only the audio, not the scripts/transcripts). Spell acronyms as
  phonetic syllables joined by **hyphens** so Kokoro reads them as one connected word
  (`"API" → "eigh-pee-eye"`); spaces make it read staccato. See the letter-sound guide in
  the lexicon's `_comment` (A = `eigh`, I = `eye`, E = `ee`). Some acronyms read fine raw
  and need no entry (e.g. `SDET`).
- **ffmpeg not found** — set `FFMPEG=/full/path/to/ffmpeg.exe`.
- **Kokoro voice** — pass `--voice=`; see the Kokoro model card for the voice list.
  (Python `kokoro` package is a documented fallback if the JS/ONNX build underperforms.)

## Podcast episodes (two-voice, standalone) — primary format

The single-narrator "read the cheat sheet aloud" output above was superseded: it only
enumerates facts. The audio product is now **standalone two-host podcast episodes** in the
style of NotebookLM's Audio Overview — a real conversation that teaches the topic on its
own, screen-free, sized to cover the main interview questions (length follows the material,
not a fixed target).

- **Hosts:** `MAYA` (mentor / ex-hiring-manager) and `LEO` (the candidate's brain — asks
  the "wait, so…" questions and restates hard points as memory hooks).
- **Scripts** live in `data/audio/podcast/<id>.txt` — committed, human-editable, one turn
  per block (`MAYA:` / `LEO:`), blank line between turns. They are LLM-authored (drafted,
  then intonation-polished for TTS: flowing clauses over choppy sentences, reported speech
  instead of quotes Kokoro can't voice-act) and remain the patchable source of truth.
- **Synthesis:** `scripts/audio/synthesize-podcast.mjs` parses the turns
  (`parseDialogue`), switches the Kokoro voice per speaker, renders each sentence, and
  stitches them with short breaths (0.14 s between sentences, 0.4 s between speakers).
  Reuses `data/audio/lexicon.json` for pronunciation.

```bash
# Render one episode (Maya = af_heart female, Leo = am_fenrir male):
node scripts/audio/synthesize-podcast.mjs --id=api-testing --leo=am_fenrir
#   --limit=N   render only the first N turns (quick voice/pronunciation A/B clips)
#   --suffix=s  append ".s" to the output name so A/B clips don't clobber
#   --maya= / --leo=   override either voice (Kokoro voice ids, e.g. am_michael, am_puck)
```

Output lands in `build/audio/podcast/<id>.mp3` (+ `.timing.json` with per-speaker cues) —
a separate namespace from the single-voice `build/audio/`, so the two never collide.
Renders are content-hash gated (voices + spoken text), so re-running skips unchanged
episodes; pass `--force` to override. The first render of a new voice downloads its ~1 MB
voice pack from Hugging Face; run online once, then `HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1` works.

## Shipped

- **Podcast rollout** — all 18 cheat-sheet topics authored, rendered, and published to Blob.
- **In-app player** — a **Listen** player (audio + synced transcript) on each cheat-sheet page.
- **Commute Mode** (`/commute`) — a screen-free playlist that queues the episodes back to back.

## Planned expansion (later phases)

- **Offline listening** — cache audio in the service worker (`public/sw.js`) behind a
  same-origin `/audio/[id]` route, plus a "Download for offline" button (leverages the PWA).
- **Audio flashcards** — question → pause → answer, generated from `data/questions/*.json`.
- **Interview Q&A audio** — a two-voice mock-interview round per topic (interviewer asks,
  candidate models a strong answer), sharing the two-voice synth via `--kind=interview`.
