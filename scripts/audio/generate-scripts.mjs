// Audio pipeline · step 1 of 4 — narration scripts.
//
// Turns each cheat sheet (data/cheatsheets/<id>.json) into a plain-text narration
// script (data/audio/scripts/<id>.txt). The script is the HUMAN-EDITABLE source of
// truth for the audio: review/tweak it, then synthesize. Code blocks are dropped
// (reading code aloud is useless), tables are linearized, and a pronunciation
// lexicon (data/audio/lexicon.json) fixes how terms are spoken.
//
// Run:  node scripts/audio/generate-scripts.mjs [--force] [--only=<id>]
//   default   create scripts that don't exist yet; PRESERVE hand-edited ones
//   --force   regenerate every script (discards hand edits — use deliberately)
//   --only    restrict to a single cheat-sheet id
//
// Idempotent by default so re-running after adding a new cheat sheet only writes
// the new file, mirroring scripts/build-cheatsheets.mjs's preserve-hand-edits rule.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stripInline, asSentence, bodyToSpeech, applyLexicon } from "./text.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CHEATSHEET_DIR = join(ROOT, "data", "cheatsheets");
const OUT_DIR = join(ROOT, "data", "audio", "scripts");
const LEXICON_PATH = join(ROOT, "data", "audio", "lexicon.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.slice("--only=".length) : null;

const lexicon = JSON.parse(readFileSync(LEXICON_PATH, "utf8")).terms;

function buildScript(sheet) {
  const parts = [];
  parts.push(asSentence(`${sheet.title} cheat sheet`));
  if (sheet.summary) parts.push(asSentence(stripInline(sheet.summary)));
  parts.push("");

  for (const section of sheet.sections) {
    parts.push(asSentence(`Section: ${stripInline(section.title)}`));
    parts.push(...bodyToSpeech(section.bodyHtml));
    parts.push("");
  }

  parts.push(asSentence(`That's the ${sheet.title} cheat sheet. Review the questions to lock it in`));

  const joined = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  return applyLexicon(joined, lexicon);
}

mkdirSync(OUT_DIR, { recursive: true });

const files = readdirSync(CHEATSHEET_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .filter((id) => !only || id === only);

let created = 0;
let skipped = 0;
let forced = 0;
for (const id of files) {
  const sheet = JSON.parse(readFileSync(join(CHEATSHEET_DIR, `${id}.json`), "utf8"));
  const outPath = join(OUT_DIR, `${id}.txt`);
  const script = buildScript(sheet);

  if (existsSync(outPath) && !force) {
    skipped += 1;
    continue;
  }
  const isForced = existsSync(outPath);
  writeFileSync(outPath, script, "utf8");
  if (isForced) forced += 1;
  else created += 1;
  console.log(`${isForced ? "regenerated" : "created"}  ${id}.txt  (${script.length} chars)`);
}

console.log(`\nDone. created=${created} regenerated=${forced} preserved=${skipped}` + (only ? ` (only=${only})` : ""));
if (skipped && !force) console.log("Preserved hand-edited scripts. Use --force to overwrite them.");
