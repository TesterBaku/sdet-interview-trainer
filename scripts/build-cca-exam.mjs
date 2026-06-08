// Build-time extractor: pulls the 40-question QUESTIONS array out of the source
// cca-mock-exam.html and emits data/mock-exams/cca-foundations.json. Run manually:
//   node scripts/build-cca-exam.mjs
// The source array is valid JS (with // comments), so we slice it out and eval it.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = "C:\\Rufat_docs\\Learning\\Claude_architect_exam+prep\\cca-mock-exam.html";
const OUT_DIR = join(__dirname, "..", "data", "mock-exams");

const html = readFileSync(SRC, "utf8");

// Slice from `const QUESTIONS = [` to the array's closing bracket. The array literal is
// closed on its own line (`\n];`), so match that rather than the first `];` (which could
// appear inside an option/explanation string and silently truncate the array).
const start = html.indexOf("const QUESTIONS = [");
if (start === -1) throw new Error("QUESTIONS array not found");
const arrStart = html.indexOf("[", start);
const closeIdx = html.indexOf("\n];", arrStart);
if (closeIdx === -1) throw new Error("end of QUESTIONS array not found");
const arrText = html.slice(arrStart, closeIdx + 2); // include the trailing newline + closing ]

const questions = Function(`"use strict"; return (${arrText});`)();

if (!Array.isArray(questions) || questions.length === 0) throw new Error("no questions parsed");

// Defensive: explanations contain inline HTML rendered via dangerouslySetInnerHTML. The source
// is trusted (Rufat's own file) and uses only <strong>/<code>/<br>, but strip <script> and inline
// event handlers anyway so nothing executable can ever flow to the DOM.
function sanitize(html2) {
  return html2
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "");
}

// Validate shape: each correct index must point at a real option.
for (const q of questions) {
  if (typeof q.id !== "number" || typeof q.domain !== "number") throw new Error(`bad id/domain on ${JSON.stringify(q).slice(0, 80)}`);
  if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`bad options on q${q.id}`);
  if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= q.options.length) throw new Error(`bad correct index on q${q.id}`);
  if (!q.text || !q.explanation) throw new Error(`missing text/explanation on q${q.id}`);
}

const domains = [
  { id: 1, label: "Agentic Architecture", weight: "27%" },
  { id: 2, label: "Claude Code", weight: "20%" },
  { id: 3, label: "Prompt Engineering", weight: "20%" },
  { id: 4, label: "MCP & Tool Design", weight: "18%" },
  { id: 5, label: "Context Management", weight: "15%" },
];

const exam = {
  id: "cca-foundations",
  title: "Claude Certified Architect — Foundations",
  description:
    "Mock exam for the Anthropic Claude Certified Architect (Foundations) certification — 40 questions across 5 domains, scored with a 70% pass threshold.",
  passThreshold: 70,
  domains,
  questions: questions.map((q) => ({
    id: q.id,
    domain: q.domain,
    text: q.text,
    options: q.options,
    correct: q.correct,
    explanation: sanitize(q.explanation),
  })),
};

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "cca-foundations.json"), JSON.stringify(exam, null, 2) + "\n", "utf8");

const perDomain = domains.map((d) => `D${d.id}=${exam.questions.filter((q) => q.domain === d.id).length}`).join(" ");
console.log(`Wrote ${exam.questions.length} questions (${perDomain}).`);
