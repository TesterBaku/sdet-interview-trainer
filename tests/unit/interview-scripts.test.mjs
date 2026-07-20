// Guard tests for the committed mock-interview scripts (data/audio/interview/*.txt).
// These are the human-editable source of truth the two-voice synth renders with
// --kind=interview, so a malformed script (bad label, empty turn, stray speaker)
// would silently ship broken audio.
// Run:  node --test tests/unit/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDialogue } from "../../scripts/audio/text.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INTERVIEW_DIR = join(ROOT, "data", "audio", "interview");
const SPEAKERS = new Set(["INTERVIEWER", "CANDIDATE"]);

const scripts = readdirSync(INTERVIEW_DIR).filter((f) => f.endsWith(".txt"));

test("there is at least one interview script", () => {
  assert.ok(scripts.length > 0, "expected committed interview scripts in data/audio/interview");
});

for (const file of scripts) {
  test(`interview script parses to valid INTERVIEWER/CANDIDATE turns: ${file}`, () => {
    const turns = parseDialogue(readFileSync(join(INTERVIEW_DIR, file), "utf8"));
    assert.ok(turns.length > 0, `${file}: no speaker turns parsed`);

    const unknown = [...new Set(turns.map((t) => t.speaker))].filter((s) => !SPEAKERS.has(s));
    assert.deepEqual(unknown, [], `${file}: unexpected speaker label(s) ${unknown.join(", ")}`);

    // parseDialogue drops any labelled turn whose body is empty, so a bare "INTERVIEWER:"
    // line with no text would silently vanish. Assert the parsed turn count matches the
    // number of speaker-label lines in the raw file, which catches exactly that.
    const labelLines = readFileSync(join(INTERVIEW_DIR, file), "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z][A-Z0-9]*:/.test(l.trim())).length;
    assert.equal(turns.length, labelLines, `${file}: a labelled turn had an empty body and was dropped`);

    // The interviewer opens the round (welcome + framing), so keep INTERVIEWER first.
    assert.equal(turns[0].speaker, "INTERVIEWER", `${file}: rounds should open on INTERVIEWER`);
  });
}
