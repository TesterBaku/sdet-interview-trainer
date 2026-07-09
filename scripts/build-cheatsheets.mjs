// Build-time converter: turns the hand-built HTML prep pages in
// C:\Rufat_docs\Learning\Interview_preparation_2026 into structured JSON the app renders
// natively (data/cheatsheets/<id>.json). Run manually:  node scripts/build-cheatsheets.mjs
//
// It is idempotent for the `sections` content, but it PRESERVES hand-authored quiz `choices`
// and `correctAnswer` already present in an existing output file (matched by quiz id), because
// those distractors are written by hand and must survive a re-run. New Q&A pairs are appended
// as scaffolds (empty choices) for authoring.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = "C:\\Rufat_docs\\Learning\\Interview_preparation_2026";
const OUT_DIR = join(__dirname, "..", "data", "cheatsheets");

// id / title / group per source file. Groups mirror the source index.html hub.
const FILES = [
  { file: "XCUITest_Framework_Story_Interview_Prep.html", id: "xcuitest", title: "XCUITest Framework Story", group: "Test Frameworks" },
  { file: "Playwright_Interview_Prep.html", id: "playwright", title: "Playwright", group: "Test Frameworks" },
  { file: "Selenium_Interview_Prep.html", id: "selenium", title: "Selenium", group: "Test Frameworks" },
  { file: "REST-Assured-API-Testing-Interview-Prep.html", id: "rest-assured", title: "REST Assured", group: "Test Frameworks" },
  { file: "TestNG_Interview_Prep.html", id: "testng", title: "TestNG", group: "Test Frameworks" },
  { file: "API_Testing_Interview_Prep.html", id: "api-testing", title: "API Testing", group: "API & Data" },
  { file: "pyspark.html", id: "pyspark", title: "PySpark & ETL", group: "API & Data" },
  { file: "SQL_Interview_Prep.html", id: "sql", title: "SQL", group: "API & Data" },
  { file: "Docker_Interview_Prep.html", id: "docker", title: "Docker", group: "DevOps & CI" },
  { file: "Kubernetes_Interview_Prep.html", id: "kubernetes", title: "Kubernetes", group: "DevOps & CI" },
  { file: "CSharp_Interview_Prep.html", id: "csharp", title: "C#", group: "Languages" },
  { file: "Java_Interview_Prep.html", id: "java", title: "Java", group: "Languages" },
  { file: "Python_Interview_Prep.html", id: "python", title: "Python", group: "Languages" },
  { file: "JavaScript_Interview_Prep.html", id: "javascript", title: "JavaScript", group: "Languages" },
];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rarr;/g, "→")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

// Defensive: drop any <script> and inline event handlers (source has none, but guard anyway).
function sanitize(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/ on[a-z]+="[^"]*"/gi, "")
    .replace(/ on[a-z]+='[^']*'/gi, "");
}

function extractAccent(html) {
  const m = html.match(/--accent:\s*(#[0-9a-fA-F]{3,8})/);
  return m ? m[1] : "#17324d";
}

function extractSummary(html) {
  const m = html.match(/class="standfirst">([\s\S]*?)<\/p>/);
  return m ? stripTags(m[1]) : "";
}

function extractTags(html) {
  const chips = [...html.matchAll(/<span class="chip">([\s\S]*?)<\/span>/g)].map((m) => stripTags(m[1]));
  return chips.filter(Boolean);
}

function extractSectionTitle(inner) {
  const m = inner.match(/<h2>(?:\s*<span class="num">[\s\S]*?<\/span>)?\s*([\s\S]*?)<\/h2>/);
  return m ? stripTags(m[1]) : "";
}

// Section body = inner HTML minus the leading <h2> and the <div class="section-rule">.
function extractSectionBody(inner) {
  return sanitize(
    inner
      .replace(/<h2>[\s\S]*?<\/h2>/, "")
      .replace(/<div class="section-rule">\s*<\/div>/, "")
      .trim()
  );
}

function extractQaPairs(inner) {
  const pairs = [];
  const re = /<div class="q">([\s\S]*?)<\/div>\s*<div class="a">([\s\S]*?)<\/div>\s*<\/div>/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    pairs.push({ question: stripTags(m[1]), answer: stripTags(m[2]) });
  }
  return pairs;
}

function loadExistingQuiz(id) {
  const out = join(OUT_DIR, `${id}.json`);
  if (!existsSync(out)) return new Map();
  try {
    const prev = JSON.parse(readFileSync(out, "utf8"));
    return new Map((prev.quiz || []).map((q) => [q.id, q]));
  } catch {
    return new Map();
  }
}

function build(entry) {
  const html = readFileSync(join(SRC_DIR, entry.file), "utf8");
  const accent = extractAccent(html);
  const summary = extractSummary(html);
  const tags = extractTags(html);

  const sections = [];
  let qaPairs = [];
  const sectionRe = /<section\b[^>]*\bid="([^"]*)"[^>]*>([\s\S]*?)<\/section>/g;
  let s;
  while ((s = sectionRe.exec(html)) !== null) {
    const [, sid, inner] = s;
    if (sid === "qa" || /class="qa"/.test(inner)) {
      qaPairs = extractQaPairs(inner);
      continue; // Q&A becomes the quiz, not a reading section
    }
    sections.push({ id: sid, title: extractSectionTitle(inner), bodyHtml: extractSectionBody(inner) });
  }

  const existing = loadExistingQuiz(entry.id);
  const quiz = qaPairs.map((pair, i) => {
    const qid = `cs-${entry.id}-${String(i + 1).padStart(3, "0")}`;
    const prev = existing.get(qid);
    // Preserve hand-authored choices/correctAnswer if the question text still matches.
    const keepAuthored = prev && prev.question === pair.question && (prev.choices || []).length > 0;
    return {
      id: qid,
      topicId: entry.id,
      topicTitle: entry.title,
      level: "mid",
      type: "quiz",
      difficulty: "medium",
      question: pair.question,
      choices: keepAuthored ? prev.choices : [],
      correctAnswer: keepAuthored ? prev.correctAnswer : "",
      explanation: pair.answer,
      tags: [entry.id],
    };
  });

  return {
    id: entry.id,
    title: entry.title,
    group: entry.group,
    accent,
    summary,
    tags,
    sections,
    quiz,
  };
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

let totalSections = 0;
let totalQuiz = 0;
let authored = 0;
for (const entry of FILES) {
  const sheet = build(entry);
  writeFileSync(join(OUT_DIR, `${entry.id}.json`), JSON.stringify(sheet, null, 2) + "\n", "utf8");
  totalSections += sheet.sections.length;
  totalQuiz += sheet.quiz.length;
  authored += sheet.quiz.filter((q) => q.choices.length > 0).length;
  console.log(`${entry.id.padEnd(12)} sections=${sheet.sections.length}  quiz=${sheet.quiz.length}  accent=${sheet.accent}`);
}
console.log(`\n${FILES.length} sheets · ${totalSections} sections · ${totalQuiz} quiz scaffolds (${authored} already authored)`);
