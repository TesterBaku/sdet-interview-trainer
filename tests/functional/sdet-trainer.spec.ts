import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { cheatSheets } from "@/lib/cheatsheets";
import { getAllCheatSheetAudio, getAllInterviewAudio, getCheatSheetTranscriptCues } from "@/lib/audio";

// Derive expected counts from the same source of truth the pages render, so adding
// a cheat sheet never silently breaks these tests again.
const cheatSheetCount = cheatSheets.length;
const quizSheetCount = cheatSheets.filter((sheet) => sheet.quiz.length > 0).length;
// Audio only surfaces when a manifest is staged (manifest.local.json is gitignored, so
// CI has none). Derive the count so the audio-UI assertions skip cleanly when unpublished.
const publishedAudio = getAllCheatSheetAudio();
const audioCount = publishedAudio.length;
const firstAudioId = publishedAudio[0]?.id ?? cheatSheets[0].id;
// Mock-interview rounds ship on their own manifest, so derive their count separately.
const publishedInterview = getAllInterviewAudio();
const interviewCount = publishedInterview.length;
const firstInterviewId = publishedInterview[0]?.id ?? cheatSheets[0].id;

const progressKey = "sdet-interview-trainer-progress";
const codeDraftKey = "sdet-interview-trainer-code-answer:python-coding-001";
const dailyDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC"
});

async function clearAppState(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ([progressStorageKey, draftStorageKey]) => {
      window.localStorage.removeItem(progressStorageKey);
      window.localStorage.removeItem(draftStorageKey);
    },
    [progressKey, codeDraftKey]
  );
}

async function seedProgress(
  page: Page,
  records: { questionId: string; status: "known" | "weak" | "review"; attempts?: number }[]
) {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      progressKey,
      JSON.stringify({
        records: records.map((record) => ({
          questionId: record.questionId,
          status: record.status,
          attempts: record.attempts ?? 1,
          lastReviewedAt: new Date().toISOString()
        })),
        completedQuestions: records.length,
        weakQuestions: records.filter((record) => record.status === "weak").length,
        reviewQuestions: records.filter((record) => record.status === "review").length
      })
    ]
  );
}

test("home Continue Practice card uses generic copy and links to a topic", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/");

  const card = page.getByRole("link", { name: /Pick up where you left off/ });
  await expect(card).toBeVisible();
  await expect(page.getByText(/Resume your latest topic/)).toBeVisible();

  // Card href must always point at a valid topic route — never a hardcoded slug
  const href = await card.getAttribute("href");
  expect(href).toMatch(/^\/topics\/[a-z0-9-]+$/);

  await card.click();
  await expect(page).toHaveURL(href!);
});

test("home surfaces an audio / Commute Mode entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Learn hands-free with audio" })).toBeVisible();
  const link = page.getByRole("link", { name: /Open Commute Mode/ });
  await expect(link).toHaveAttribute("href", "/commute");
  await link.click();
  await expect(page).toHaveURL("/commute");
});

test("home, topics, and topic detail render the MVP navigation path", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Practice like the interview is already scheduled." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Practice", exact: true })).toBeVisible();
  await expect(page.getByText("TOTAL")).toBeVisible();
  await expect(page.getByText("525")).toBeVisible();

  // Topics now lives one level down, inside the Practice hub.
  await page.getByRole("link", { name: "Practice", exact: true }).click();
  await expect(page).toHaveURL("/practice");
  await page.getByRole("link", { name: /Open Topics/ }).click();
  await expect(page).toHaveURL("/topics");
  await expect(page.getByRole("heading", { name: "Choose a training lane" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Python Coding for QA/SDET" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AWS Basics for QA/SDET" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start practice" })).toHaveCount(11);

  await page.getByRole("link", { name: "Start practice" }).first().click();
  await expect(page).toHaveURL("/topics/python-coding");
  await expect(page.getByRole("heading", { name: "Topic progress" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Flashcards/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quiz Practice/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mock Interview/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review Weak Questions/ })).toBeVisible();
});

test("flashcards reveal answers, navigate cards, and save weak status to progress", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/flashcards/python-coding");

  await expect(page.getByText("Card 1 of 21")).toBeVisible();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await expect(page.getByText("Correct answer")).toBeVisible();
  await expect(page.getByText("set", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Weak" }).click();
  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: [{ questionId: "python-coding-002", status: "weak", attempts: 1 }],
      weakQuestions: 1
    });

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Card 2 of 21")).toBeVisible();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await expect(page.getByText("Short answer")).toBeVisible();
  await expect(page.getByText("Validate required structure and business-critical fields", { exact: false })).toBeVisible();
});

// playwright-python flashcard questions: 29 non-coding out of 50 total.
// Last card is playwright-python-050. Update these if questions change.
const playwrightPythonFlashcardIds = [
  "playwright-python-001", "playwright-python-002", "playwright-python-004",
  "playwright-python-006", "playwright-python-008", "playwright-python-010",
  "playwright-python-012", "playwright-python-014", "playwright-python-016",
  "playwright-python-018", "playwright-python-019", "playwright-python-021",
  "playwright-python-022", "playwright-python-023", "playwright-python-024",
  "playwright-python-025", "playwright-python-026", "playwright-python-027",
  "playwright-python-030", "playwright-python-032", "playwright-python-034",
  "playwright-python-036", "playwright-python-038", "playwright-python-040",
  "playwright-python-042", "playwright-python-044", "playwright-python-046",
  "playwright-python-048", "playwright-python-050"
];
const ppLastCard = playwrightPythonFlashcardIds[playwrightPythonFlashcardIds.length - 1];
const ppTotalCards = playwrightPythonFlashcardIds.length; // 29

test("flashcards last card requires marking before Finish is enabled", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/flashcards/playwright-python");

  // Navigate to the last card
  for (let i = 0; i < ppTotalCards - 1; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText(`Card ${ppTotalCards} of ${ppTotalCards}`)).toBeVisible();

  // Finish is disabled and hint text is visible until the card is marked
  await expect(page.getByRole("button", { name: "Finish" })).toBeDisabled();
  await expect(page.getByText("Mark this card to finish")).toBeVisible();
  await expect(page.getByRole("link", { name: "Finish" })).not.toBeVisible();

  // Mark the card — Finish becomes an active link, hint disappears
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "Known" }).click();
  await expect(page.getByRole("button", { name: "Finish" })).not.toBeVisible();
  await expect(page.getByText("Mark this card to finish")).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Finish" })).toBeVisible();

  await page.getByRole("link", { name: "Finish" }).click();
  await expect(page).toHaveURL("/topics/playwright-python");
});

test("flashcards all cards marked tracks full completion", async ({ page }) => {
  // Pre-seed first 15 records; test that marking the last card via UI records all 16
  const first15 = playwrightPythonFlashcardIds.slice(0, -1).map((id) => ({
    questionId: id, status: "known", attempts: 1, lastReviewedAt: new Date().toISOString()
  }));
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [progressKey, JSON.stringify({ records: first15, completedQuestions: 15, weakQuestions: 0, reviewQuestions: 0 })]
  );

  await page.goto("/flashcards/playwright-python");
  for (let i = 0; i < ppTotalCards - 1; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }

  // Last card is unmarked — Finish is disabled
  await expect(page.getByRole("button", { name: "Finish" })).toBeDisabled();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await page.getByRole("button", { name: "Known" }).click();

  // All cards now marked — Finish navigates to topic
  await page.getByRole("link", { name: "Finish" }).click();
  await expect(page).toHaveURL("/topics/playwright-python");

  const progress = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"),
    progressKey
  );
  expect(progress.records).toHaveLength(ppTotalCards);
  expect(progress.completedQuestions).toBe(ppTotalCards);
});

test("flashcards previously marked card enables Finish immediately on return", async ({ page }) => {
  // Pre-seed the last card as already marked from a prior session
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      progressKey,
      JSON.stringify({
        records: [{ questionId: ppLastCard, status: "known", attempts: 1, lastReviewedAt: new Date().toISOString() }],
        completedQuestions: 1,
        weakQuestions: 0,
        reviewQuestions: 0
      })
    ]
  );

  await page.goto("/flashcards/playwright-python");
  for (let i = 0; i < ppTotalCards - 1; i++) {
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText(`Card ${ppTotalCards} of ${ppTotalCards}`)).toBeVisible();

  // Previously marked — Finish is immediately active, no hint shown
  await expect(page.getByRole("link", { name: "Finish" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Finish" })).not.toBeVisible();
  await expect(page.getByText("Mark this card to finish")).not.toBeVisible();
});

test("quiz preserves correctness and final save is idempotent", async ({ page }) => {
  await clearAppState(page);
  // test-automation-strategy has 18 quiz questions; navigate through Q1–Q17 quickly,
  // then test correctness + idempotency on Q18 (test-automation-strategy-041).
  await page.goto("/quiz/test-automation-strategy");

  for (let i = 0; i < 17; i++) {
    await page.locator("label").first().click();
    await page.getByRole("button", { name: "Submit answer" }).click();
    await page.getByRole("button", { name: "Save and continue" }).click();
  }

  // Q18 — wrong answer to verify correctness feedback
  await page.getByLabel("Network latency from slow external APIs").check();
  await expect(page.getByRole("button", { name: "Submit answer" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(
    page.getByText("Incorrect. Correct answer: Shared mutable state between tests that run in parallel")
  ).toBeVisible();
  await page.getByRole("button", { name: "Save and finish" }).click();

  await expect(page.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(page.getByText("Quiz complete.")).toBeVisible();
  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: expect.arrayContaining([
        expect.objectContaining({ questionId: "test-automation-strategy-041", status: "review", attempts: 1 })
      ])
    });

  // Idempotency: force-click Saved again, attempts must not increment
  await page.getByRole("button", { name: "Saved" }).click({ force: true });
  const progress = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey);
  const lastRecord = progress.records.find((r: { questionId: string }) => r.questionId === "test-automation-strategy-041");
  expect(lastRecord.attempts).toBe(1);
});

test("mock interview shows answer-structure guidance before the textarea", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/mock-interview/python-coding");

  // Guidance is visible before any reveal
  await expect(page.getByText("Try to answer in 60–90 seconds.")).toBeVisible();
  await expect(page.getByText("Direct answer")).toBeVisible();
  await expect(page.getByText("Tool or technique")).toBeVisible();
  await expect(page.getByText("Real project example")).toBeVisible();
  await expect(page.getByText("Tradeoff or limitation")).toBeVisible();

  // Guidance stays visible after revealing the model answer
  await page.getByRole("button", { name: "Reveal model answer" }).click();
  await expect(page.getByText("Try to answer in 60–90 seconds.")).toBeVisible();
});

test("mock interview accepts an answer, reveals model guidance, and saves self-rating", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/mock-interview/python-coding");

  const answerBox = page.getByPlaceholder("Write your answer as if you are speaking to an interviewer...");
  await expect(answerBox).toHaveAttribute("id", "mock-answer-python-coding-003");
  await expect(answerBox).toHaveAttribute("name", "mock-answer-python-coding-003");
  await answerBox.fill("I would validate contract and business fields.");
  await page.getByRole("button", { name: "Reveal model answer" }).click();
  await expect(page.getByRole("heading", { name: "Model answer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Self-review checklist" })).toBeVisible();
  await page.getByRole("button", { name: "Known" }).click();

  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: [{ questionId: "python-coding-003", status: "known", attempts: 1 }],
      completedQuestions: 1
    });
});

test("mock interview last prompt shows Back to topic link instead of disabled Next", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/mock-interview/python-coding");

  // python-coding has 5 interview questions; navigate to the last one
  const totalPrompts = await page.getByText(/Prompt \d+ of (\d+)/).textContent();
  const total = Number(totalPrompts?.match(/of (\d+)/)?.[1] ?? 1);

  for (let i = 0; i < total - 1; i++) {
    await page.getByRole("button", { name: "Next prompt" }).click();
  }

  await expect(page.getByText(`Prompt ${total} of ${total}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next prompt" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Back to topic" }).last()).toBeVisible();

  await page.getByRole("link", { name: "Back to topic" }).last().click();
  await expect(page).toHaveURL("/topics/python-coding");
});

test("coding gym supports sandbox drafts, reveal controls, status save, and draft persistence", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/coding-gym");

  const firstTask = page.locator("article").filter({ hasText: "Find duplicate values" });
  await expect(firstTask.getByRole("heading", { name: "Answer sandbox" })).toBeVisible();
  const answerBox = firstTask.getByPlaceholder("Write your python answer here...");
  await expect(answerBox).toHaveAttribute("id", "code-answer-python-coding-001");
  await expect(answerBox).toHaveAttribute("name", "code-answer-python-coding-001");
  await answerBox.fill("def find_duplicates(items):\n    return []");
  await expect(firstTask.getByText(/\d+ chars/i)).toBeVisible();
  await expect(firstTask.getByRole("button", { name: "Clear draft" })).toBeEnabled();
  await expect.poll(async () => page.evaluate((key) => window.localStorage.getItem(key), codeDraftKey)).toContain("find_duplicates");

  await page.reload();
  const reloadedFirstTask = page.locator("article").filter({ hasText: "Find duplicate values" });
  await expect(reloadedFirstTask.getByPlaceholder("Write your python answer here...")).toHaveValue(/find_duplicates/);

  await reloadedFirstTask.getByRole("button", { name: "Reveal hint" }).click();
  await expect(reloadedFirstTask.getByText("Track seen values and duplicate values with sets.")).toBeVisible();
  await reloadedFirstTask.getByRole("button", { name: "Reveal solution" }).click();
  await expect(reloadedFirstTask.getByText("Common mistakes")).toBeVisible();
  await reloadedFirstTask.getByRole("button", { name: "Known" }).click();

  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: [{ questionId: "python-coding-001", status: "known", attempts: 1 }],
      completedQuestions: 1
    });
});

// ── SEO, sitemap, and robots tests ──────────────────────────────────────────

test("each major page has a descriptive <title>", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SDET Interview Trainer/);

  await page.goto("/topics");
  await expect(page).toHaveTitle(/All Topics.*SDET Interview Trainer/i);

  await page.goto("/topics/python-coding");
  await expect(page).toHaveTitle(/Python Coding.*SDET Interview Trainer/i);

  await page.goto("/flashcards/python-coding");
  await expect(page).toHaveTitle(/Python Coding.*Flashcards.*SDET Interview Trainer/i);

  await page.goto("/quiz/python-coding");
  await expect(page).toHaveTitle(/Python Coding.*Quiz.*SDET Interview Trainer/i);

  await page.goto("/mock-interview/python-coding");
  await expect(page).toHaveTitle(/Python Coding.*Mock Interview.*SDET Interview Trainer/i);

  await page.goto("/coding-gym");
  await expect(page).toHaveTitle(/Coding Gym.*SDET Interview Trainer/i);

  await page.goto("/progress");
  await expect(page).toHaveTitle(/Your Progress.*SDET Interview Trainer/i);

  await page.goto("/review");
  await expect(page).toHaveTitle(/Review Queue.*SDET Interview Trainer/i);

  await page.goto("/daily-practice");
  await expect(page).toHaveTitle(/Daily Practice.*SDET Interview Trainer/i);
});

test("home page has OpenGraph meta tags", async ({ page }) => {
  await page.goto("/");
  const ogTitle = page.locator('meta[property="og:title"]');
  const ogDesc = page.locator('meta[property="og:description"]');
  await expect(ogTitle).toHaveAttribute("content", /SDET Interview Trainer/);
  await expect(ogDesc).toHaveAttribute("content", /.+/);
});

test("home page exposes og:image and twitter:image social cards", async ({ page, request }) => {
  await page.goto("/");
  const ogImage = page.locator('meta[property="og:image"]');
  const twitterImage = page.locator('meta[name="twitter:image"]');
  await expect(ogImage).toHaveAttribute("content", /opengraph-image/);
  await expect(twitterImage).toHaveAttribute("content", /twitter-image/);

  // The generated image must actually resolve to a PNG (not 404). The meta URL is
  // absolute (metadataBase → prod domain); fetch its path against the local server.
  const ogUrl = await ogImage.getAttribute("content");
  expect(ogUrl).toBeTruthy();
  for (const meta of [ogImage, twitterImage]) {
    const url = await meta.getAttribute("content");
    expect(url).toBeTruthy();
    const path = new URL(url!).pathname + new URL(url!).search;
    const imageResponse = await request.get(path);
    expect(imageResponse.status()).toBe(200);
    expect(imageResponse.headers()["content-type"]).toContain("image/png");
  }
});

test("sitemap.xml is reachable and contains topic URLs", async ({ page }) => {
  const response = await page.goto("/sitemap.xml");
  expect(response?.status()).toBe(200);
  const body = await page.content();
  expect(body).toContain("python-coding");
  expect(body).toContain("flashcards");
  expect(body).toContain("quiz");
  expect(body).toContain("mock-interview");
});

test("robots.txt is reachable and allows crawling", async ({ page }) => {
  const response = await page.goto("/robots.txt");
  expect(response?.status()).toBe(200);
  const body = await page.content();
  expect(body).toContain("sitemap.xml");
});

// ── Progress page ────────────────────────────────────────────────────────────

test("progress page reflects saved localStorage records", async ({ page }) => {
  await clearAppState(page);
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [
      progressKey,
      JSON.stringify({
        records: [
          {
            questionId: "python-coding-001",
            status: "weak",
            attempts: 1,
            lastReviewedAt: new Date().toISOString()
          },
          {
            questionId: "python-coding-002",
            status: "review",
            attempts: 1,
            lastReviewedAt: new Date().toISOString()
          }
        ],
        completedQuestions: 2,
        weakQuestions: 1,
        reviewQuestions: 1
      })
    ]
  );

  await page.goto("/progress");

  await expect(page.getByRole("heading", { name: "Track readiness by topic" })).toBeVisible();
  await expect(page.getByText("2/50 completed, 1 weak")).toBeVisible();
  await expect(page.getByText("4%").first()).toBeVisible();
});

test("progress page exports a versioned JSON backup of saved records", async ({ page }) => {
  await seedProgress(page, [
    { questionId: "python-coding-001", status: "weak" },
    { questionId: "sql-001", status: "known" }
  ]);
  await page.goto("/progress");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^sdet-progress-\d{4}-\d{2}-\d{2}\.json$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  expect(payload.app).toBe("sdet-interview-trainer");
  expect(payload.version).toBe(1);
  expect(payload.progress.records).toHaveLength(2);
  expect(payload.progress.records.map((r: { questionId: string }) => r.questionId)).toContain("sql-001");

  await expect(page.getByRole("status")).toHaveText(/Exported 2 records/);
});

test("progress page imports a backup and updates the summary", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/progress");

  const backup = JSON.stringify({
    app: "sdet-interview-trainer",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: {
      records: [
        { questionId: "python-coding-001", status: "weak", attempts: 3, lastReviewedAt: new Date().toISOString() }
      ],
      // Deliberately wrong counts — the importer must recompute, not trust these.
      completedQuestions: 99,
      weakQuestions: 99,
      reviewQuestions: 99
    }
  });

  // No existing records → import applies without a confirm dialog.
  await page.locator('input[aria-label="Import progress backup file"]').setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup)
  });

  await expect(page.getByRole("status")).toHaveText(/Imported 1 records/);
  // Recomputed counts drive the UI, not the tampered totals in the file.
  await expect(page.getByText("1/50 completed, 1 weak")).toBeVisible();

  const stored = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"),
    progressKey
  );
  expect(stored.weakQuestions).toBe(1);
  expect(stored.records).toHaveLength(1);
});

test("progress page rejects a malformed import file", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/progress");

  await page.locator('input[aria-label="Import progress backup file"]').setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{ not valid json")
  });

  await expect(page.getByRole("status")).toHaveText(/isn't valid JSON/);
});

// ── Daily Practice ──────────────────────────────────────────────────────────

test("home hero leads with the Daily Practice CTA and a topics link", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/");

  // Primary CTA: the daily plan is the loud, no-decision default entry point.
  const dailyCta = page.getByRole("link", { name: /Start Daily Practice/ });
  await expect(dailyCta).toBeVisible();
  await expect(dailyCta).toHaveAttribute("href", "/daily-practice");

  // Secondary CTA for those who'd rather choose a lane.
  const topicsCta = page.getByRole("link", { name: "Browse training lanes", exact: true });
  await expect(topicsCta).toBeVisible();
  await expect(topicsCta).toHaveAttribute("href", "/topics");

  // Cheat Sheets teaser count is derived from data, not a hardcoded number.
  await expect(page.getByText(`${cheatSheetCount} reference pages`, { exact: false })).toBeVisible();
});

test("daily practice renders all 5 sections with the planned mix of items", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/daily-practice");

  await expect(page.getByRole("heading", { name: "Python / Java coding" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "SQL" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playwright / Selenium" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "API / CI/CD / AWS" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strategy / Mock" })).toBeVisible();

  // 3 + 2 + 2 + 2 + 1 = 10 items total
  await expect(page.getByText(/0 of 10 done today/)).toBeVisible();
});

test("daily practice plan is stable across reloads on the same day", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/daily-practice");

  const firstItemTitles = await page.locator("main section ul li p.font-bold").allTextContents();

  await page.reload();
  const reloadedTitles = await page.locator("main section ul li p.font-bold").allTextContents();

  expect(reloadedTitles).toEqual(firstItemTitles);
});

test("daily practice deep-links each item to the exact question", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/daily-practice");

  const firstItem = page.locator("main section ul li a").first();
  const title = (await firstItem.locator("p.font-bold").textContent())?.trim();
  expect(title).toBeTruthy();

  const href = await firstItem.getAttribute("href");
  expect(href).toMatch(/[?&]question=/);

  await firstItem.click();
  await expect(page).toHaveURL(href!);
  await expect(page.locator("article").first().getByRole("heading", { name: title! })).toBeVisible();
});

test("daily practice does not emit React hydration errors", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error" && /hydration|Minified React error #418|Text content does not match/i.test(text)) {
      hydrationErrors.push(text);
    }
  });

  await clearAppState(page);
  await page.goto("/daily-practice");
  await expect(page.getByRole("heading", { name: dailyDateFormatter.format(new Date()) })).toBeVisible();

  expect(hydrationErrors).toEqual([]);
});

test("navigation surfaces a Practice lane (Daily/Topics/Quizzes are folded in)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Practice", exact: true })).toBeVisible();
  // The old standalone Daily/Topics/Quizzes nav lanes are gone from the nav bar.
  const nav = page.locator("nav");
  await expect(nav.getByRole("link", { name: "Daily", exact: true })).toHaveCount(0);
});

test("Practice hub links to Daily, Topics, and Quizzes", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { name: "Pick how you want to practice" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Daily Practice/ })).toHaveAttribute("href", "/daily-practice");
  await expect(page.getByRole("link", { name: /Open Topics/ })).toHaveAttribute("href", "/topics");
  await expect(page.getByRole("link", { name: /Open Quizzes/ })).toHaveAttribute("href", "/quizzes");
});

// ── Commute Mode (podcast audio) ────────────────────────────────────────────

test("Practice hub links to Commute Mode", async ({ page }) => {
  await page.goto("/practice");
  await expect(page.getByRole("link", { name: /Open Commute Mode/ })).toHaveAttribute("href", "/commute");
});

test("commute page renders and keeps the Practice lane active", async ({ page }) => {
  await page.goto("/commute");
  await expect(page.getByRole("heading", { name: /Learn with your eyes closed/ })).toBeVisible();
  // /commute is folded under Practice, so that nav lane stays reachable/lit.
  await expect(page.getByRole("link", { name: "Practice", exact: true })).toBeVisible();
});

test("cheat-sheet page shows a Listen player when an episode is published", async ({ page }) => {
  test.skip(audioCount === 0, "no audio manifest staged (run audio:podcast:captions + publish --local)");
  await page.goto(`/cheatsheets/${firstAudioId}`);
  const player = page.getByRole("region", { name: /^Listen:/ });
  await expect(player).toBeVisible();
  await expect(player.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expect(player.getByRole("button", { name: /Playback speed/ })).toBeVisible();
});

test("commute playlist lists every published episode", async ({ page }) => {
  test.skip(audioCount === 0, "no audio manifest staged");
  await page.goto("/commute");
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  await expect(items).toHaveCount(audioCount);
});

test("cheat-sheet index shows a headphone badge for episodes with audio", async ({ page }) => {
  test.skip(audioCount === 0, "no audio manifest staged");
  await page.goto("/cheatsheets");
  await expect(page.getByText("🎧").first()).toBeVisible();
});

test("cheat-sheet page shows a distinct Mock interview player when a round is published", async ({ page }) => {
  test.skip(interviewCount === 0, "no interview manifest staged (run audio:interview:captions + publish --local)");
  await page.goto(`/cheatsheets/${firstInterviewId}`);
  const player = page.getByRole("region", { name: /^Mock interview:/ });
  await expect(player).toBeVisible();
  await expect(player.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("cheat-sheet audio player offers an offline download link", async ({ page }) => {
  test.skip(audioCount === 0, "no audio manifest staged (run audio:podcast:publish --local)");
  await page.goto(`/cheatsheets/${firstAudioId}`);
  const download = page.getByRole("link", { name: /Download .* audio for offline listening/ }).first();
  await expect(download).toBeVisible();
  // Blob's ?download=1 forces Content-Disposition: attachment, so the mp3 saves to the device.
  await expect(download).toHaveAttribute("href", /\.mp3(\?|&)download=1$/);
});

test("commute exposes a Mock Interview lane when interview rounds are published", async ({ page }) => {
  test.skip(interviewCount === 0 || audioCount === 0, "need both lanes staged for the format switch");
  await page.goto("/commute");
  const tab = page.getByRole("tab", { name: /Mock Interview/ });
  await expect(tab).toBeVisible();
  await tab.click();
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  await expect(items).toHaveCount(interviewCount);
});

test("commute lane switcher is a keyboard-operable ARIA tab pattern", async ({ page }) => {
  test.skip(interviewCount === 0 || audioCount === 0, "need both lanes for a tablist to render");
  await page.goto("/commute");
  // Completed pattern: tabs control a labelled tabpanel, and arrow keys move selection + focus.
  const podcastTab = page.getByRole("tab", { name: /Podcast/ });
  const interviewTab = page.getByRole("tab", { name: /Mock Interview/ });
  const panel = page.getByRole("tabpanel");
  await expect(panel).toBeVisible();
  await expect(podcastTab).toHaveAttribute("aria-controls", "commute-tabpanel");

  await podcastTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(interviewTab).toHaveAttribute("aria-selected", "true");
  await expect(interviewTab).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(podcastTab).toHaveAttribute("aria-selected", "true");
  await expect(podcastTab).toBeFocused();
});

test("commute uses one persistent audio element that auto-advances the queue in place", async ({ page }) => {
  test.skip(audioCount < 2, "need at least two episodes to advance");
  await page.goto("/commute");
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  const audio = page.locator("audio");
  // Tag the element + record its source, then simulate the first episode ending.
  const beforeSrc = await audio.evaluate((el: HTMLAudioElement) => {
    (el as unknown as Record<string, unknown>).__persist = true;
    return el.src;
  });
  await audio.evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("ended")));
  // Advanced to episode 2, and it's the SAME <audio> node (tag survived → no remount, so
  // playback can continue in place instead of on a fresh element the lock screen would refuse).
  await expect(items.nth(1).getByRole("button")).toHaveAttribute("aria-current", "true");
  const after = await audio.evaluate((el: HTMLAudioElement) => ({
    src: el.src,
    persisted: (el as unknown as Record<string, unknown>).__persist === true,
  }));
  expect(after.persisted).toBe(true);
  expect(after.src).not.toBe(beforeSrc);
});

test("commute publishes Media Session metadata for lock-screen controls", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio");
  await page.goto("/commute");
  const supported = await page.evaluate(() => "mediaSession" in navigator);
  test.skip(!supported, "browser has no Media Session API");
  // The metadata is published by a client effect after mount, so poll rather than read once.
  await expect
    .poll(() => page.evaluate(() => navigator.mediaSession.metadata?.artist ?? null))
    .toBe("SDET Interview Trainer");
  const title = await page.evaluate(() => navigator.mediaSession.metadata?.title ?? "");
  expect(title.length).toBeGreaterThan(0);
});

// Position keys mirror lib/audioPosition.ts + the commute lane/episode namespace.
const audioPositionKey = (laneKey: string, episodeId: string) =>
  `sdet-interview-trainer-audio-position:commute:${laneKey}:${episodeId}`;
const commuteResumeKey = "sdet-interview-trainer-commute-resume";

async function seedLocalStorage(page: Page, entries: Record<string, string>) {
  await page.goto("/");
  await page.evaluate((pairs) => {
    for (const [key, value] of Object.entries(pairs)) window.localStorage.setItem(key, value);
  }, entries);
}

test("commute offers an explicit Resume affordance for the last-played episode", async ({ page }) => {
  test.skip(audioCount < 2, "need at least two episodes to resume a later one");
  const resumeId = publishedAudio[1].id;
  await seedLocalStorage(page, {
    [commuteResumeKey]: JSON.stringify({ laneKey: "podcast", episodeId: resumeId }),
    [audioPositionKey("podcast", resumeId)]: "120",
  });
  await page.goto("/commute");

  // The banner is a client-only affordance (localStorage-backed) — poll for it to appear.
  const resume = page.getByRole("button", { name: /Resume where you left off/ });
  await expect(resume).toBeVisible();
  await expect(resume).toContainText("2:00"); // formatClock(120)

  // Explicit jump: clicking it makes the saved episode the current one (never a silent auto-seek
  // on load — the queue is still parked at episode 1 until the listener acts).
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  await expect(items.nth(0).getByRole("button")).toHaveAttribute("aria-current", "true");
  await resume.click();
  await expect(items.nth(1).getByRole("button")).toHaveAttribute("aria-current", "true");
  // Once a session has started, the "restore last time" banner steps out of the way.
  await expect(resume).toBeHidden();
});

test("commute Resume seeks even when the saved episode is the already-loaded first track", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio");
  // Episode 0 is the default loaded track; resuming it must still seek + play (not no-op).
  const resumeId = publishedAudio[0].id;
  await seedLocalStorage(page, {
    [commuteResumeKey]: JSON.stringify({ laneKey: "podcast", episodeId: resumeId }),
    [audioPositionKey("podcast", resumeId)]: "75",
  });
  await page.goto("/commute");
  // Record play() + the seek target without touching the network. Previously (resume as a
  // standing prop) episode 0 was a no-op here: src unchanged ⇒ no metadata reload ⇒ no seek and
  // no play. The one-shot command must seek to 75 s and start playback regardless.
  await page.evaluate(() => {
    const w = window as unknown as { __played: number; __seekedTo: number };
    w.__played = 0;
    w.__seekedTo = -1;
    HTMLMediaElement.prototype.play = function () {
      w.__played += 1;
      return Promise.resolve();
    };
    const proto = HTMLMediaElement.prototype as unknown as {
      __ct?: PropertyDescriptor;
    };
    const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "currentTime");
    if (desc) {
      Object.defineProperty(HTMLMediaElement.prototype, "currentTime", {
        configurable: true,
        get() {
          return desc.get?.call(this) ?? 0;
        },
        set(v: number) {
          w.__seekedTo = v;
          desc.set?.call(this, v);
        },
      });
      void proto;
    }
  });
  const resume = page.getByRole("button", { name: /Resume where you left off/ });
  await expect(resume).toBeVisible();
  await resume.click();
  const result = await page.evaluate(() => {
    const w = window as unknown as { __played: number; __seekedTo: number };
    return { played: w.__played, seekedTo: w.__seekedTo };
  });
  expect(result.played).toBeGreaterThan(0);
  expect(result.seekedTo).toBe(75);
});

test("commute keeps a separate position per lane when you peek at another", async ({ page }) => {
  test.skip(interviewCount === 0 || audioCount < 3, "need both lanes + a few podcast episodes");
  await page.goto("/commute");
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");

  // Pick episode 3 in the podcast lane.
  await items.nth(2).getByRole("button").click();
  await expect(items.nth(2).getByRole("button")).toHaveAttribute("aria-current", "true");

  // Peek at the Mock Interview lane — it has its own (fresh) position.
  await page.getByRole("tab", { name: /Mock Interview/ }).click();
  await expect(items.nth(0).getByRole("button")).toHaveAttribute("aria-current", "true");

  // Back to podcast: the spot is preserved, not reset to episode 1.
  await page.getByRole("tab", { name: /Podcast/ }).click();
  await expect(items.nth(2).getByRole("button")).toHaveAttribute("aria-current", "true");
});

test("commute playlist reflects listened + partially-heard episodes", async ({ page }) => {
  test.skip(audioCount < 2, "need at least two episodes");
  // Seed episode 2 as partially heard before load.
  await seedLocalStorage(page, {
    [audioPositionKey("podcast", publishedAudio[1].id)]: "90",
  });
  await page.goto("/commute");
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  await expect(items.nth(1)).toContainText("1:30 in"); // formatClock(90) + partial marker

  // Finishing episode 1 records it as listened (fires for every ended, not just queue end).
  await page.locator("audio").evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("ended")));
  await expect(items.nth(0)).toContainText("Listened");
});

test("commute shows a buffering indicator only while actively playing", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio");
  await page.goto("/commute");
  const audio = page.locator("audio");
  // A stall before playback (preload) must NOT show a spinner on an idle track.
  await audio.evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("waiting")));
  await expect(page.getByText(/Buffering/)).toBeHidden();
  // Once playing, a stall shows the spinner; recovering (playing) clears it.
  await audio.evaluate((el: HTMLAudioElement) => {
    el.dispatchEvent(new Event("play"));
    el.dispatchEvent(new Event("waiting"));
  });
  await expect(page.getByText(/Buffering/)).toBeVisible();
  await audio.evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("playing")));
  await expect(page.getByText(/Buffering/)).toBeHidden();
});

test("commute error card lets you Skip a failed episode without losing it to an auto-cascade", async ({ page }) => {
  test.skip(audioCount < 2, "need a next episode to skip to");
  await page.goto("/commute");
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  const player = page.getByRole("region", { name: /^Listen:/ });
  // A source error surfaces a recoverable card (no silent auto-advance) — episode 1 stays put.
  await page.locator("audio").evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("error")));
  await expect(player.getByText(/Couldn't play this episode/)).toBeVisible();
  await expect(items.nth(0).getByRole("button")).toHaveAttribute("aria-current", "true");
  await expect(player.getByRole("button", { name: /Retry/ })).toBeVisible();
  // Skip is the explicit way forward, and it advances the queue.
  await player.getByRole("button", { name: /Skip to next/ }).click();
  await expect(items.nth(1).getByRole("button")).toHaveAttribute("aria-current", "true");
});

test("commute error card offers no Skip on the last episode (nothing to advance to)", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio");
  await page.goto("/commute");
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  await items.last().getByRole("button").click();
  // Wait for the selection to commit so onError sees the last index (no next) — otherwise a
  // race could dispatch the error while the queue index is still 0 and a Skip would render.
  await expect(items.last().getByRole("button")).toHaveAttribute("aria-current", "true");
  await page.locator("audio").evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("error")));
  const player = page.getByRole("region", { name: /^Listen:/ });
  await expect(player.getByRole("button", { name: /Retry/ })).toBeVisible();
  await expect(player.getByRole("button", { name: /Skip to next/ })).toHaveCount(0);
});

test("commute loads the transcript on demand from the published VTT", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio + captions");
  await page.goto("/commute");
  const player = page.getByRole("region", { name: /^Listen:/ });
  await player.getByRole("button", { name: "Transcript" }).click();
  // Fetched + parsed client-side (cues aren't baked into the static page), so poll for the list.
  const transcript = player.getByRole("list", { name: "Transcript" });
  await expect(transcript).toBeVisible();
  await expect(transcript.getByRole("listitem").first()).toBeVisible();
  await expect(player.getByRole("button", { name: "Hide transcript" })).toBeVisible();
});

test("commute transcript drops a stale fetch that resolves after the track changed", async ({ page }) => {
  test.skip(audioCount < 2, "need two episodes to advance between");
  const firstVtt = publishedAudio[0].id;
  // Episode 2's real first cue, from the same source the VTT is generated from — the transcript
  // must show THIS, not the stale episode-1 cues a late-resolving fetch would otherwise pin on.
  const secondFirstCue = getCheatSheetTranscriptCues(publishedAudio[1].id)[0]?.text ?? "";
  let firstResolved = false;
  // Hold episode 1's VTT in flight so its fetch is still pending when we advance.
  await page.route(`**/${firstVtt}.vtt`, async (route) => {
    if (!firstResolved) {
      firstResolved = true;
      await new Promise((r) => setTimeout(r, 1200));
    }
    await route.continue();
  });
  await page.goto("/commute");
  const player = page.getByRole("region", { name: /^Listen:/ });
  await player.getByRole("button", { name: "Transcript" }).click(); // episode 1 fetch (delayed)
  await expect(player.getByText(/Loading transcript/)).toBeVisible();
  // Advance before episode 1's fetch resolves, then let it resolve into the void.
  await page.locator("audio").evaluate((el: HTMLAudioElement) => el.dispatchEvent(new Event("ended")));
  const items = page.getByRole("list", { name: "Episode playlist" }).getByRole("listitem");
  await expect(items.nth(1).getByRole("button")).toHaveAttribute("aria-current", "true");
  await page.waitForTimeout(1400);
  // Open episode 2's transcript — it must be episode 2's, not the pinned stale episode-1 cues.
  await player.getByRole("button", { name: "Transcript" }).click();
  const transcript = player.getByRole("list", { name: "Transcript" });
  await expect(transcript).toBeVisible();
  await expect(transcript).toContainText(secondFirstCue.slice(0, 40));
});

test("commute transcript offers Retry after a failed fetch", async ({ page }) => {
  test.skip(audioCount === 0, "needs published captions");
  const firstVtt = publishedAudio[0].id;
  let calls = 0;
  await page.route(`**/${firstVtt}.vtt`, async (route) => {
    calls += 1;
    if (calls === 1) return route.abort(); // first attempt fails
    return route.continue(); // retry succeeds
  });
  await page.goto("/commute");
  const player = page.getByRole("region", { name: /^Listen:/ });
  await player.getByRole("button", { name: "Transcript" }).click();
  await expect(player.getByText(/Transcript unavailable/)).toBeVisible();
  await player.getByRole("button", { name: /Retry/ }).click();
  await expect(player.getByRole("list", { name: "Transcript" })).toBeVisible();
});

test("commute player exposes accessible seek + speed labels", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio");
  await page.goto("/commute");
  const player = page.getByRole("region", { name: /^Listen:/ });
  // Seek announces clock time, not a raw second count.
  await expect(player.getByRole("slider", { name: "Seek" })).toHaveAttribute(
    "aria-valuetext",
    /\d+:\d\d of \d+:\d\d/,
  );
  // Speed label reads "Playback speed: 1×"; Play carries no redundant aria-pressed.
  await expect(player.getByRole("button", { name: /Playback speed: 1×/ })).toBeVisible();
  const play = player.getByRole("button", { name: "Play", exact: true });
  await expect(play).not.toHaveAttribute("aria-pressed", /.*/);
  // Track changes are announced politely.
  await expect(player.getByText(/^Now playing:/)).toHaveAttribute("aria-live", "polite");
});

test("commute transport controls meet the 44px touch target", async ({ page }) => {
  test.skip(audioCount === 0, "needs published audio");
  await page.goto("/commute");
  const player = page.getByRole("region", { name: /^Listen:/ });
  const box = await player.getByRole("button", { name: /Playback speed/ }).boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
});

// ── Progress breakdown + /review route ──────────────────────────────────────

test("progress page shows per-type breakdown sections and link to review queue", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/progress");

  await expect(page.getByRole("heading", { name: "Overall Progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Coding Progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quiz Progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mock Interview Progress" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Review/ })).toHaveAttribute("href", "/review");
});

test("review page lists weak and review questions and filters by status", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      progressKey,
      JSON.stringify({
        records: [
          { questionId: "python-coding-001", status: "weak", attempts: 1, lastReviewedAt: new Date().toISOString() },
          { questionId: "python-coding-002", status: "review", attempts: 1, lastReviewedAt: new Date().toISOString() },
          { questionId: "python-coding-003", status: "known", attempts: 1, lastReviewedAt: new Date().toISOString() },
        ],
        completedQuestions: 3,
        weakQuestions: 1,
        reviewQuestions: 1,
      }),
    ]
  );

  await page.goto("/review");

  // Default: both flagged questions are visible (weak + review), known is excluded
  await expect(page.getByRole("heading", { name: "2 questions" })).toBeVisible();

  // Filter to weak only
  await page.getByRole("link", { name: "Weak only" }).click();
  await expect(page).toHaveURL(/status=weak/);
  await expect(page.getByRole("heading", { name: "1 question" })).toBeVisible();

  // Reset to all
  await page.getByRole("link", { name: "All statuses" }).click();
  await expect(page).toHaveURL("/review");
  await expect(page.getByRole("heading", { name: "2 questions" })).toBeVisible();
});

test("review queue deep-links coding, quiz, and interview items to exact questions", async ({ page }) => {
  await seedProgress(page, [
    { questionId: "python-coding-004", status: "weak" },
    { questionId: "python-coding-013", status: "review" },
    { questionId: "python-coding-019", status: "weak" },
  ]);

  await page.goto("/review");

  const codingLink = page.getByRole("link", { name: /Normalize and compare strings/ });
  await expect(codingLink).toHaveAttribute("href", "/coding-gym?topic=python-coding&question=python-coding-004");
  await codingLink.click();
  await expect(page.locator("article").first().getByRole("heading", { name: "Normalize and compare strings" })).toBeVisible();

  await page.goto("/review");
  const quizLink = page.getByRole("link", { name: /What does json.loads/ });
  await expect(quizLink).toHaveAttribute("href", "/quiz/python-coding?question=python-coding-013");
  await quizLink.click();
  await expect(page.getByText("What does json.loads() return when given the string")).toBeVisible();

  await page.goto("/review");
  const interviewLink = page.getByRole("link", { name: /design reusable Python test utility functions/ });
  await expect(interviewLink).toHaveAttribute("href", "/mock-interview/python-coding?question=python-coding-019");
  await interviewLink.click();
  await expect(page.getByText("How do you design reusable Python test utility functions")).toBeVisible();
});

test("review queue supports quiz-only filtering", async ({ page }) => {
  await seedProgress(page, [
    { questionId: "python-coding-004", status: "weak" },
    { questionId: "python-coding-013", status: "review" },
    { questionId: "python-coding-019", status: "weak" },
  ]);

  await page.goto("/review");
  const quizChip = page.getByRole("link", { name: "Quiz only" });
  await expect(quizChip).toHaveAttribute("href", "/review?type=quiz");

  await quizChip.click();
  await expect(page).toHaveURL("/review?type=quiz");
  await expect(page.getByRole("heading", { name: "1 question" })).toBeVisible();
  await expect(page.getByRole("link", { name: /What does json.loads/ })).toBeVisible();
  await expect(page.getByText("Normalize and compare strings")).not.toBeVisible();
  await expect(page.getByText("How do you design reusable Python test utility functions")).not.toBeVisible();
});

test("review queue empty state renders when no flagged questions exist", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/review");

  await expect(page.getByRole("heading", { name: "0 questions" })).toBeVisible();
  await expect(page.getByText(/Nothing matches these filters/)).toBeVisible();
});

test("review queue ignores invalid query params and falls back to defaults", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(
    ([key, value]) => window.localStorage.setItem(key, value),
    [
      progressKey,
      JSON.stringify({
        records: [
          { questionId: "python-coding-001", status: "weak", attempts: 1, lastReviewedAt: new Date().toISOString() },
          { questionId: "python-coding-002", status: "review", attempts: 1, lastReviewedAt: new Date().toISOString() },
        ],
        completedQuestions: 2,
        weakQuestions: 1,
        reviewQuestions: 1,
      }),
    ]
  );

  // Invalid status, type, and topic should be ignored — both flagged questions still visible
  await page.goto("/review?status=foo&type=bar&topic=does-not-exist");
  await expect(page.getByRole("heading", { name: "2 questions" })).toBeVisible();
});

test("Review is folded into Progress and reachable from it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Progress", exact: true })).toBeVisible();
  // Review no longer has its own nav lane; the Progress page links into it.
  const nav = page.locator("nav");
  await expect(nav.getByRole("link", { name: "Review", exact: true })).toHaveCount(0);

  await page.goto("/progress");
  await expect(page.getByRole("link", { name: /Open Review/ })).toHaveAttribute("href", "/review");
});

// ── Per-topic coding tasks ───────────────────────────────────────────────────

test("topic detail shows Coding Tasks card for topics with coding questions", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/topics/python-coding");

  const codingCard = page.getByRole("link", { name: /Coding Tasks/ });
  await expect(codingCard).toBeVisible();
  await expect(codingCard).toHaveAttribute("href", "/coding-gym?topic=python-coding");

  await expect(page.getByRole("link", { name: /Flashcards/ })).toHaveAttribute("href", "/flashcards/python-coding");
  await expect(page.getByRole("link", { name: /Review Weak Questions/ })).toHaveAttribute("href", "/review?topic=python-coding");
});

test("topic detail shows Coding Tasks card for aws (now has coding questions)", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/topics/aws");

  await expect(page.getByRole("link", { name: /Flashcards/ })).toBeVisible();
  // Every topic now ships coding questions, so the Coding Tasks card is always shown.
  await expect(page.getByRole("link", { name: /Coding Tasks/ })).toHaveAttribute(
    "href",
    "/coding-gym?topic=aws"
  );
});

test("coding gym filters tasks when ?topic= query is set", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/coding-gym?topic=python-coding");

  await expect(page.getByText(/Showing 29 tasks for Python Coding/i)).toBeVisible();

  const cards = page.locator("article");
  await expect(cards).toHaveCount(29);

  await page.getByRole("link", { name: "Show all topics" }).click();
  await expect(page).toHaveURL("/coding-gym");
  // back to unfiltered view: more tasks than the single-topic count
  await expect(page.locator("article").first()).toBeVisible();
  const totalCards = await page.locator("article").count();
  expect(totalCards).toBeGreaterThan(29);
});

test("coding gym opens a requested task first when question query is set", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/coding-gym?topic=java-coding&question=java-coding-007");

  await expect(page.getByText(/Showing 25 tasks for Java Coding/i)).toBeVisible();
  await expect(
    page.locator("article").first().getByRole("heading", { name: "Build a Selenium-style explicit wait helper" })
  ).toBeVisible();
});

test("coding gym falls back to all tasks when ?topic= is unknown", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/coding-gym?topic=does-not-exist");

  // No context banner is shown for an unknown topic
  await expect(page.getByText(/Showing .* tasks for/i)).not.toBeVisible();
  // Full unfiltered list still renders
  await expect(page.locator("article").first()).toBeVisible();
  const totalCards = await page.locator("article").count();
  expect(totalCards).toBeGreaterThan(13);
});

test("coding gym renders task content (loading fallback is replaced, not stuck)", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/coding-gym");

  // The branded fallback must give way to real task content once hydrated.
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.getByText("Loading coding tasks…")).not.toBeVisible();
});

test("coding gym offers a path forward when JavaScript is disabled", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/coding-gym");

  // With no JS the client component can't hydrate; the noscript escape hatch
  // must point users to a working route instead of leaving a dead spinner.
  const escapeHatch = page.getByText(/Coding Gym needs JavaScript/i);
  await expect(escapeHatch).toBeVisible();
  await expect(page.getByRole("link", { name: "Topics" }).last()).toHaveAttribute("href", "/topics");

  await context.close();
});

// ── Mobile viewport regression ───────────────────────────────────────────────

test("coding gym cards do not overflow the viewport on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/coding-gym");

  const bodyOverflow = await page.evaluate(() => document.body.scrollWidth > document.documentElement.clientWidth);
  expect(bodyOverflow).toBe(false);

  const cards = page.locator("article");
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const box = await cards.nth(i).boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  }
});

// ── Cheat sheets + quizzes ───────────────────────────────────────────────────

test("navigation keeps a Cheat Sheets lane; Quizzes moves into the Practice hub", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Cheat Sheets", exact: true })).toBeVisible();
  // Quizzes is no longer its own nav lane.
  const nav = page.locator("nav");
  await expect(nav.getByRole("link", { name: "Quizzes", exact: true })).toHaveCount(0);
});

test("cheat sheets index lists all grouped sheets", async ({ page }) => {
  await page.goto("/cheatsheets");

  await expect(page.getByRole("heading", { name: "Study the core concepts" })).toBeVisible();
  // Every cheat sheet (SDET sheets + certification sheets) renders one "Open cheat sheet" link.
  await expect(page.getByRole("link", { name: "Open cheat sheet" })).toHaveCount(cheatSheetCount);
  // Group headers from the source hub, plus the Certifications group
  await expect(page.getByRole("heading", { name: "Test Frameworks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Languages" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Certifications" })).toBeVisible();

  await page.getByRole("link", { name: "Open cheat sheet" }).first().click();
  await expect(page).toHaveURL(/\/cheatsheets\/[a-z-]+$/);
});

test("a cheat sheet renders converted concept sections, TOC, and a quiz link", async ({ page }) => {
  await page.goto("/cheatsheets/sql");

  await expect(page.getByRole("heading", { name: "SQL", exact: true })).toBeVisible();
  // Converted section content (heading + keynote callout + code) renders natively
  await expect(page.getByRole("heading", { name: /How a SELECT Actually Runs/ })).toBeVisible();
  await expect(page.getByText("Why it matters:")).toBeVisible();
  await expect(page.locator(".cheatsheet-prose table").first()).toBeVisible();

  const quizLink = page.getByRole("link", { name: /Take the 12-question quiz/ });
  await expect(quizLink).toHaveAttribute("href", "/cheatsheets/sql/quiz");
  await quizLink.click();
  await expect(page).toHaveURL("/cheatsheets/sql/quiz");
  await expect(page.getByRole("heading", { name: "SQL Quiz" })).toBeVisible();
});

test("cheat sheet Rapid-Fire Q&A reveals verbatim answers on demand", async ({ page }) => {
  await page.goto("/cheatsheets/sql");

  const detail = page.locator("details").filter({ hasText: "WHERE vs HAVING?" });
  await expect(detail).toBeVisible();

  // Answer is present but collapsed until the user opens it
  const answer = detail.getByText("HAVING filters groups after GROUP BY", { exact: false });
  await expect(answer).toBeHidden();
  await detail.locator("summary").click();
  await expect(answer).toBeVisible();
});

test("cheat-sheet quiz scores answers and saves progress under a cs- id", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/cheatsheets/sql/quiz");

  await expect(page.getByText("Question 1 of 12")).toBeVisible();

  // Choose the correct option for cs-sql-001 (WHERE vs HAVING)
  await page.locator("label").filter({ hasText: "HAVING filters groups after GROUP BY and can" }).click();
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByRole("heading", { name: "Correct" })).toBeVisible();
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByText("Question 2 of 12")).toBeVisible();
  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: expect.arrayContaining([
        expect.objectContaining({ questionId: "cs-sql-001", status: "known", attempts: 1 })
      ])
    });
});

test("cheat-sheet quiz progress does not pollute the main question totals", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/cheatsheets/sql/quiz");
  await page.locator("label").filter({ hasText: "HAVING filters groups after GROUP BY and can" }).click();
  await page.getByRole("button", { name: "Submit answer" }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();

  // The cs- record is saved, but overall progress (the main question bank) stays at 0% —
  // cheat-sheet quiz ids are excluded from summarizeProgress's allQuestions set.
  await page.goto("/progress");
  const overall = page.locator("section").filter({ has: page.getByRole("heading", { name: "Overall Progress" }) });
  await expect(overall.getByText("0%")).toBeVisible();
});

test("quizzes index lists every sheet and shows answered progress", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/quizzes");

  await expect(page.getByRole("heading", { name: "Learn through quizzes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start quiz/ })).toHaveCount(quizSheetCount);

  await page.getByRole("link", { name: /Start quiz/ }).first().click();
  await expect(page).toHaveURL(/\/cheatsheets\/[a-z-]+\/quiz$/);
});

// ── Certification track: CCA cheat sheet + mock exam ─────────────────────────

test("navigation includes a Mock Exam link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Mock Exam", exact: true })).toBeVisible();
});

test("CCA cheat sheet sits in Certifications and routes to the mock exam (no inline quiz)", async ({ page }) => {
  await page.goto("/cheatsheets/cca-foundations");

  await expect(page.getByRole("heading", { name: "Claude Certified Architect", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Model Tiers/ })).toBeVisible();

  const cta = page.getByRole("link", { name: /Take the Mock Exam/ });
  await expect(cta).toHaveAttribute("href", "/mock-exam/cca-foundations");

  // No Rapid-Fire Q&A block, since this sheet has no inline quiz
  await expect(page.getByRole("heading", { name: /Rapid-Fire/ })).toHaveCount(0);
});

test("quizzes index excludes the mock-exam-only cheat sheet", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/quizzes");

  await expect(page.getByRole("heading", { name: "Learn through quizzes" })).toBeVisible();
  // The mock-exam-only CCA sheet has no inline quiz, so it's excluded from the count.
  await expect(page.getByRole("link", { name: /Start quiz/ })).toHaveCount(quizSheetCount);
  await expect(page.getByText("Claude Certified Architect")).toHaveCount(0);
});

test("the mock-exam-backed cheat sheet exposes no empty inline quiz route", async ({ page }) => {
  const res = await page.goto("/cheatsheets/cca-foundations/quiz");
  expect(res?.status()).toBe(404);
});

test("mock exam scores an answer, reveals the explanation, submits, and breaks down by domain", async ({ page }) => {
  await page.goto("/mock-exam/cca-foundations");

  await expect(page.getByRole("heading", { name: /Claude Certified Architect/ })).toBeVisible();
  await expect(page.getByText("0 of 40 answered")).toBeVisible();

  // Answer Q1 correctly (the fan-out/fan-in pattern)
  await page.getByRole("button", { name: "Fan-out / fan-in (parallel) pattern" }).click();
  await expect(page.getByText("✓ Correct", { exact: false })).toBeVisible();

  // Submit → results with pass/fail verdict and a per-domain breakdown
  await page.getByRole("button", { name: /Submit/ }).click();
  await expect(page.getByRole("heading", { name: "Score by domain" })).toBeVisible();
  await expect(page.getByText("Below pass", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: "Restart exam" }).click();
  await expect(page.getByText("0 of 40 answered")).toBeVisible();
});

test("mock exam domain filter narrows the visible questions", async ({ page }) => {
  await page.goto("/mock-exam/cca-foundations");

  // All 40 questions render as articles by default
  await expect(page.locator("article")).toHaveCount(40);

  // Filter to D4 (MCP & Tool Design) — 7 questions
  await page.getByRole("button", { name: /D4: MCP & Tool Design/ }).click();
  await expect(page.locator("article")).toHaveCount(7);
});

test("sitemap includes cheat-sheet and quiz URLs", async ({ page }) => {
  const response = await page.goto("/sitemap.xml");
  expect(response?.status()).toBe(200);
  const body = await page.content();
  expect(body).toContain("/cheatsheets");
  expect(body).toContain("/cheatsheets/sql");
  expect(body).toContain("/cheatsheets/sql/quiz");
  expect(body).toContain("/quizzes");
  expect(body).toContain("/mock-exam");
  expect(body).toContain("/mock-exam/cca-foundations");
  expect(body).toContain("/cheatsheets/cca-foundations");
});

// ── Mobile nav disclosure (useDismissable) ───────────────────────────────────

test("mobile menu closes on Escape and restores focus to the toggle", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const toggle = page.getByRole("button", { name: "Open menu" });
  await toggle.click();

  const closeToggle = page.getByRole("button", { name: "Close menu" });
  await expect(closeToggle).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");

  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  // Escape returns focus to the toggle for keyboard/AT users.
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("mobile menu closes on an outside tap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");

  // A pointerdown outside the <nav> dismisses the menu.
  await page.getByRole("heading", { name: "Practice like the interview is already scheduled." }).click();

  await expect(page.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
});

// ── Security headers ─────────────────────────────────────────────────────────

test("responses include required security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
});
