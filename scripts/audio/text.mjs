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
    .replace(/_/g, " ") // snake_case identifiers (bind_tools, add_item) → spoken as words
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

// Parse a speaker-labeled podcast dialogue into ordered turns. A new turn starts at
// each line beginning with an uppercase "SPEAKER:" label (e.g. "MAYA:"); every
// subsequent non-empty line — including paragraphs separated by blank lines — is
// appended to the current turn until the next label. Blank lines are ignored (a turn
// may span them), and any text before the first label (stray notes/headers) is dropped.
// This is line-driven rather than blank-line-block driven, so adjacent-label lines are
// not merged into one turn and multi-paragraph turns are not silently truncated.
//
// Pass `speakers` (an iterable of valid labels) to scope what counts as a turn boundary:
// only those labels start a new turn, so a continuation line that happens to open with an
// acronym+colon (e.g. a candidate answer beginning "TDD: ...") is folded into the current
// turn as prose instead of being mistaken for a phantom speaker. Omit it for the permissive
// behavior (any uppercase label starts a turn) used as an authoring lint by the guard tests.
export function parseDialogue(text, speakers = null) {
  const known = speakers ? new Set(speakers) : null;
  const turns = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([A-Z][A-Z0-9]*):\s*(.*)$/);
    if (m && (!known || known.has(m[1]))) {
      current = { speaker: m[1], text: m[2].trim() };
      turns.push(current);
    } else if (current) {
      current.text = current.text ? `${current.text} ${line}` : line;
    }
  }
  return turns.filter((t) => t.text);
}

// Split a turn's text into sentence units, so each is synthesized separately (stable
// output) and gets its own caption cue/timing. Splits after . ! or ? followed by
// whitespace — but NOT after a single-letter-plus-dot (an initialism like "U.S." or
// "e.g."), which would otherwise fragment mid-abbreviation. An ellipsis ("... ") is
// still a break point, which reads as a natural mid-turn pause.
export function splitSentences(text) {
  return text
    .split(/(?<=[.!?])(?<!\b[A-Za-z]\.)\s+/)
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
