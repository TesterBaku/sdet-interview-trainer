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
} from "../../scripts/audio/text.mjs";

test("decodeEntities resolves the entities cheat sheets use", () => {
  assert.equal(decodeEntities("a &amp; b &lt;x&gt; &quot;q&quot; it&#39;s"), 'a & b <x> "q" it\'s');
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
