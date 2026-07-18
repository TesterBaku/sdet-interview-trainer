// Pure text transforms shared by the audio pipeline (and unit-tested in
// tests/unit/audio-text.test.mjs). No I/O here — just HTML → narration prose.

export function decodeEntities(s) {
  // Resolve &amp; LAST so a double-escaped entity (e.g. "&amp;lt;", meant to
  // display as the literal "&lt;") is not collapsed into "<".
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, ", ")
    .replace(/&ndash;/g, ", ")
    .replace(/&amp;/g, "&");
}

// Curly punctuation, dashes, arrows, and abbreviations → speech-friendly ASCII.
// Em/en dashes and arrows become a comma/"to" so the narrator pauses or reads the
// intent instead of mispronouncing the glyph. A spaced slash ("stop / rm") reads
// as "slash" otherwise, so collapse it to a comma; tight paths ("/var/lib") stay.
export function normalizeText(s) {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/[→⇒]/g, " to ")
    .replace(/\s+\/\s+/g, ", ")
    .replace(/#(?=\d)/g, "number ")
    .replace(/\be\.g\.\s*,?/gi, "for example, ")
    .replace(/\bi\.e\.\s*,?/gi, "that is, ")
    .replace(/…/g, "...")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();
}

// Strip inline tags, keeping their text, then decode + normalize.
export function stripInline(html) {
  return normalizeText(decodeEntities(html.replace(/<[^>]+>/g, "")));
}

// Ensure a spoken chunk ends with sentence-final punctuation so TTS pauses.
export function asSentence(text) {
  const t = text.trim();
  if (!t) return "";
  return /[.!?:]$/.test(t) ? t : t + ".";
}

// Linearize a <table> to spoken rows: each row's non-empty cells joined by commas.
export function tableToSpeech(tableHtml) {
  const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const lines = [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map((m) => stripInline(m[1]))
      .filter(Boolean);
    if (cells.length) lines.push(asSentence(cells.join(", ")));
  }
  return lines.join(" ");
}

// Convert one section's bodyHtml into an array of narration sentences.
// Code blocks are dropped (narrating raw code is noise); tables are linearized in
// place; block boundaries (headings, list items, paragraphs, callouts) become real
// newlines, which are then the only split points — no in-band sentinel that page
// content could itself contain.
export function bodyToSpeech(html) {
  // Collapse source newlines to spaces so only our inserted newlines separate blocks.
  let work = html.replace(/[\r\n]+/g, " ");
  work = work.replace(/<pre[\s\S]*?<\/pre>/gi, " ");
  work = work.replace(/<table[\s\S]*?<\/table>/gi, (m) => `\n${tableToSpeech(m)}\n`);
  work = work
    .replace(/<(?:p|div|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n");

  const out = [];
  for (const line of work.split(/\n+/)) {
    const text = stripInline(line);
    if (text) out.push(asSentence(text));
  }
  return out;
}

// Parse a speaker-labeled podcast dialogue into ordered turns. Blocks are separated
// by blank lines; each turn must begin with an uppercase "SPEAKER:" label (e.g.
// "MAYA:"). Whitespace inside a turn is collapsed to single spaces. Blocks without a
// leading label (stray notes, headers) are ignored rather than spoken.
export function parseDialogue(text) {
  const turns = [];
  for (const block of text.split(/\n\s*\n/)) {
    const m = block.match(/^\s*([A-Z][A-Z0-9]*):\s*([\s\S]+)$/);
    if (!m) continue;
    const body = m[2].replace(/\s+/g, " ").trim();
    if (body) turns.push({ speaker: m[1], text: body });
  }
  return turns;
}

// Split a turn's text into sentence units, so each is synthesized separately (stable
// output) and gets its own caption cue/timing. Splits after . ! or ? that is followed
// by whitespace — an ellipsis ("... ") is therefore also a break point, which reads as
// a natural mid-turn pause.
export function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Apply pronunciation overrides. `terms` is [[from, to], …]; matched case-sensitively
// on word boundaries (for alphanumeric-bounded terms). A single combined pass so a
// replacement is never re-scanned (e.g. "XCUITest"→"X C UI Test" isn't re-hit by a
// later "UI" rule); longest source wins at any position.
export function applyLexicon(text, terms) {
  const ordered = [...terms].sort((a, b) => b[0].length - a[0].length);
  if (!ordered.length) return text;
  const replacements = new Map(ordered.map(([from, to]) => [from, to]));
  const alternation = ordered
    .map(([from]) => {
      const escaped = from.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      const boundaryStart = /^[A-Za-z0-9]/.test(from) ? "\\b" : "";
      const boundaryEnd = /[A-Za-z0-9]$/.test(from) ? "\\b" : "";
      return `${boundaryStart}${escaped}${boundaryEnd}`;
    })
    .join("|");
  return text.replace(new RegExp(alternation, "g"), (m) => replacements.get(m) ?? m);
}
