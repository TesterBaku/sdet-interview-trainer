// Guard tests for the committed podcast episode scripts (data/audio/podcast/*.txt).
// These are the human-editable source of truth the synth renders, so a malformed
// script (bad label, empty turn, stray speaker) would silently ship broken audio.
// Run:  node --test tests/unit/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDialogue } from "../../scripts/audio/text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PODCAST_DIR = join(ROOT, "data", "audio", "podcast");
const SPEAKERS = new Set(["MAYA", "LEO"]);

const scripts = readdirSync(PODCAST_DIR).filter((f) => f.endsWith(".txt"));

test("there is at least one podcast script", () => {
  assert.ok(scripts.length > 0, "expected committed episode scripts in data/audio/podcast");
});

for (const file of scripts) {
  test(`podcast script parses to valid MAYA/LEO turns: ${file}`, () => {
    const turns = parseDialogue(readFileSync(join(PODCAST_DIR, file), "utf8"));
    assert.ok(turns.length > 0, `${file}: no speaker turns parsed`);

    const unknown = [...new Set(turns.map((t) => t.speaker))].filter((s) => !SPEAKERS.has(s));
    assert.deepEqual(unknown, [], `${file}: unexpected speaker label(s) ${unknown.join(", ")}`);

    // parseDialogue drops any labelled turn whose body is empty, so a bare "MAYA:" line
    // with no text would silently vanish. Assert the parsed turn count matches the number
    // of speaker-label lines in the raw file, which catches exactly that.
    const labelLines = readFileSync(join(PODCAST_DIR, file), "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z][A-Z0-9]*:/.test(l.trim())).length;
    assert.equal(turns.length, labelLines, `${file}: a labelled turn had an empty body and was dropped`);

    // The opener sets up the cold-open interview question; keep MAYA first for consistency.
    assert.equal(turns[0].speaker, "MAYA", `${file}: episodes should open on MAYA`);
  });
}
