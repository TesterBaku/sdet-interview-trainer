// Unit tests for the audio narration text transforms (scripts/audio/text.mjs).
// Run:  node --test tests/unit/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decodeEntities,
  normalizeText,
  stripInline,
  asSentence,
  tableToSpeech,
  bodyToSpeech,
  applyLexicon,
  parseDialogue,
  splitSentences,
} from "../../scripts/audio/text.mjs";

test("decodeEntities resolves the entities cheat sheets use", () => {
  assert.equal(decodeEntities("a &amp; b &lt;x&gt; &quot;q&quot; it&#39;s"), 'a & b <x> "q" it\'s');
});

test("decodeEntities resolves &amp; last so double-escaped entities survive", () => {
  // "&amp;lt;" is meant to display as the literal "&lt;", not decode to "<".
  assert.equal(decodeEntities("&amp;lt;"), "&lt;");
});

test("normalizeText makes glyphs speech-friendly", () => {
  assert.equal(normalizeText("host 8080 → container 3000"), "host 8080 to container 3000");
  assert.equal(normalizeText("stop / rm"), "stop, rm"); // spaced slash → comma
  assert.equal(normalizeText("a — b"), "a, b"); // em dash → comma
  assert.equal(normalizeText("the #1 mistake"), "the number 1 mistake");
  assert.equal(normalizeText("e.g. a shell"), "for example, a shell");
  assert.equal(normalizeText("“curly” ‘quotes’"), "\"curly\" 'quotes'");
});

test("normalizeText preserves tight paths (no spaces around slash)", () => {
  assert.equal(normalizeText("/var/lib/postgresql"), "/var/lib/postgresql");
});

test("asSentence adds terminal punctuation only when missing", () => {
  assert.equal(asSentence("hello"), "hello.");
  assert.equal(asSentence("done."), "done.");
  assert.equal(asSentence("really?"), "really?");
  assert.equal(asSentence("Section: X:"), "Section: X:");
  assert.equal(asSentence("   "), "");
});

test("stripInline flattens inline tags and normalizes", () => {
  assert.equal(stripInline("<strong>API</strong> and <code>docker&nbsp;run</code>"), "API and docker run");
});

test("bodyToSpeech drops code blocks entirely", () => {
  const html = "<p>Use this.</p><pre><code>FROM node:20\nRUN npm ci</code></pre>";
  const out = bodyToSpeech(html).join(" ");
  assert.ok(out.includes("Use this."));
  assert.ok(!out.includes("FROM node"), "code block must not be narrated");
});

test("bodyToSpeech turns list items into sentences", () => {
  const out = bodyToSpeech("<ul class='clean'><li>First point</li><li>Second point</li></ul>");
  assert.deepEqual(out, ["First point.", "Second point."]);
});

test("bodyToSpeech keeps a table's content even when wrapped in a block element", () => {
  const html = "<div><p>Before.</p><table><tr><td>run</td><td>start</td></tr></table><p>After.</p></div>";
  const out = bodyToSpeech(html).join(" ");
  assert.ok(out.includes("run, start."), "wrapped table must not be dropped");
  assert.ok(out.includes("Before.") && out.includes("After."));
  assert.ok(!out.includes("TABLE"), "no placeholder leakage");
});

test("bodyToSpeech does not treat a literal 'BLOCK' word as a separator", () => {
  const out = bodyToSpeech("<p>Use the BLOCK statement here.</p>");
  assert.deepEqual(out, ["Use the BLOCK statement here."]);
});

test("tableToSpeech linearizes rows into comma-joined sentences", () => {
  const html = "<table><tr><th>Command</th><th>Does</th></tr><tr><td>docker run</td><td>start a container</td></tr></table>";
  assert.equal(tableToSpeech(html), "Command, Does. docker run, start a container.");
});

test("applyLexicon replaces terms on word boundaries, longest-first", () => {
  const terms = [["API", "A P I"], ["APIs", "A P Is"], ["SQL", "sequel"]];
  assert.equal(applyLexicon("API and APIs and SQL", terms), "A P I and A P Is and sequel");
  // Must not mangle a word that merely contains a term.
  assert.equal(applyLexicon("rapid", terms), "rapid");
});

test("applyLexicon does not re-fire a shorter rule inside a longer rule's replacement", () => {
  // "XCUITest" → "X C UI Test" must NOT then be hit by the "UI" → "U I" rule.
  const terms = [["XCUITest", "X C UI Test"], ["UI", "U I"]];
  assert.equal(applyLexicon("XCUITest rocks", terms), "X C UI Test rocks");
});

test("parseDialogue splits labeled turns and folds continuation lines into the turn", () => {
  const script = "MAYA: Hello there.\nSecond line.\n\nLEO: Hi Maya.\n";
  assert.deepEqual(parseDialogue(script), [
    { speaker: "MAYA", text: "Hello there. Second line." },
    { speaker: "LEO", text: "Hi Maya." },
  ]);
});

test("parseDialogue splits adjacent-label lines with no blank line between them", () => {
  // Regression: a blank-line-block parser would merge these and speak the literal "LEO:".
  const script = "MAYA: Hi there.\nLEO: Hello back.";
  assert.deepEqual(parseDialogue(script), [
    { speaker: "MAYA", text: "Hi there." },
    { speaker: "LEO", text: "Hello back." },
  ]);
});

test("parseDialogue keeps a multi-paragraph turn (internal blank line) instead of dropping it", () => {
  const script = "MAYA: Para one.\n\nStill Maya, para two.\n\nLEO: Reply.";
  assert.deepEqual(parseDialogue(script), [
    { speaker: "MAYA", text: "Para one. Still Maya, para two." },
    { speaker: "LEO", text: "Reply." },
  ]);
});

test("parseDialogue ignores text before the first speaker label", () => {
  const script = "# a stray note\n\nMAYA: Only this is spoken.\n\n   \n";
  assert.deepEqual(parseDialogue(script), [{ speaker: "MAYA", text: "Only this is spoken." }]);
});

test("splitSentences breaks on sentence enders and drops empties", () => {
  assert.deepEqual(splitSentences("First. Second! Third?"), ["First.", "Second!", "Third?"]);
});

test("splitSentences treats an ellipsis as a natural break point", () => {
  // Matches the approved render: "times..." becomes its own cue, giving a mid-turn pause.
  assert.deepEqual(splitSentences("twenty more times... and it's off."), [
    "twenty more times...",
    "and it's off.",
  ]);
});

test("splitSentences does not fragment inside an abbreviation/initialism", () => {
  // The dot after "U.S." / "e.g." must not be treated as a sentence boundary.
  assert.deepEqual(splitSentences("The U.S. market is big. It grows."), [
    "The U.S. market is big.",
    "It grows.",
  ]);
  assert.deepEqual(splitSentences("Use it, e.g. here. Done."), ["Use it, e.g. here.", "Done."]);
});
