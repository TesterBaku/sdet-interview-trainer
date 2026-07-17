// Pure text transforms shared by the audio pipeline (and unit-tested in
// tests/unit/audio-text.test.mjs). No I/O here — just HTML → narration prose.

export function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, ", ")
    .replace(/&ndash;/g, ", ");
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
// Code blocks are dropped (narrating raw code is noise); tables are linearized;
// headings, list items, paragraphs, and callouts each become a sentence.
export function bodyToSpeech(html) {
  const out = [];
  let work = html.replace(/<pre[\s\S]*?<\/pre>/gi, " ");

  const tables = [];
  work = work.replace(/<table[\s\S]*?<\/table>/gi, (m) => {
    tables.push(tableToSpeech(m));
    return ` TABLE${tables.length - 1} `;
  });

  work = work.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, t) => ` BLOCK ${stripInline(t)} BLOCK `);
  work = work.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => ` BLOCK ${asSentence(stripInline(t))} BLOCK `);
  work = work.replace(/<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>/gi, (_, t) => ` BLOCK ${asSentence(stripInline(t))} BLOCK `);
  work = work.replace(/ TABLE(\d+) /g, (_, i) => ` BLOCK ${tables[Number(i)]} BLOCK `);

  for (const chunk of work.split(" BLOCK ")) {
    const text = stripInline(chunk);
    if (text) out.push(asSentence(text));
  }
  return out.filter(Boolean);
}

// Apply pronunciation overrides. `terms` is [[from, to], …]; matched case-sensitively
// on word boundaries (for alphanumeric-bounded terms), longest source first.
export function applyLexicon(text, terms) {
  let out = text;
  const ordered = [...terms].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of ordered) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    const boundaryStart = /^[A-Za-z0-9]/.test(from) ? "\\b" : "";
    const boundaryEnd = /[A-Za-z0-9]$/.test(from) ? "\\b" : "";
    out = out.replace(new RegExp(`${boundaryStart}${escaped}${boundaryEnd}`, "g"), to);
  }
  return out;
}
