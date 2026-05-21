import { expect, test } from "@playwright/test";

const progressKey = "sdet-interview-trainer-progress";
const codeDraftKey = "sdet-interview-trainer-code-answer:python-coding-001";

async function clearAppState(page: { goto: (url: string) => Promise<unknown>; evaluate: <T, A>(fn: (arg: A) => T, arg: A) => Promise<T> }) {
  await page.goto("/");
  await page.evaluate(
    ([progressStorageKey, draftStorageKey]) => {
      window.localStorage.removeItem(progressStorageKey);
      window.localStorage.removeItem(draftStorageKey);
    },
    [progressKey, codeDraftKey]
  );
}

test("home, topics, and topic detail render the MVP navigation path", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Practice like the interview is already scheduled." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Topics" })).toBeVisible();
  await expect(page.getByText("TOTAL")).toBeVisible();
  await expect(page.getByText("250")).toBeVisible();

  await page.getByRole("link", { name: "Topics" }).click();
  await expect(page).toHaveURL("/topics");
  await expect(page.getByRole("heading", { name: "Choose a training lane" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Python Coding for QA/SDET" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "AWS Basics for QA/SDET" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start practice" })).toHaveCount(10);

  await page.getByRole("link", { name: "Start practice" }).first().click();
  await expect(page).toHaveURL("/topics/python-coding");
  await expect(page.getByRole("heading", { name: "Topic progress" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Flashcards/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quiz/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mock Interview/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Review Weak Questions/ })).toBeVisible();
});

test("flashcards reveal answers, navigate cards, and save weak status to progress", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/flashcards/python-coding");

  await expect(page.getByText("Card 1 of 12")).toBeVisible();
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
  await expect(page.getByText("Card 2 of 12")).toBeVisible();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await expect(page.getByText("Short answer")).toBeVisible();
  await expect(page.getByText("Validate required structure and business-critical fields", { exact: false })).toBeVisible();
});

// playwright-python flashcard questions: 16 non-coding out of 25 total.
// Last card is playwright-python-025 (interview). Update these if questions change.
const playwrightPythonFlashcardIds = [
  "playwright-python-001", "playwright-python-002", "playwright-python-004",
  "playwright-python-006", "playwright-python-008", "playwright-python-010",
  "playwright-python-012", "playwright-python-014", "playwright-python-016",
  "playwright-python-018", "playwright-python-019", "playwright-python-021",
  "playwright-python-022", "playwright-python-023", "playwright-python-024",
  "playwright-python-025"
];
const ppLastCard = playwrightPythonFlashcardIds[playwrightPythonFlashcardIds.length - 1];
const ppTotalCards = playwrightPythonFlashcardIds.length; // 16

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
  // test-automation-strategy has 9 quiz questions; navigate through Q1–Q8 quickly,
  // then test correctness + idempotency on Q9 (test-automation-strategy-011).
  await page.goto("/quiz/test-automation-strategy");

  for (let i = 0; i < 8; i++) {
    await page.locator("label").first().click();
    await page.getByRole("button", { name: "Submit answer" }).click();
    await page.getByRole("button", { name: "Save and continue" }).click();
  }

  // Q9 — wrong answer to verify correctness feedback
  await page.getByLabel("A manual sign-off step before any deployment").check();
  await expect(page.getByRole("button", { name: "Submit answer" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(
    page.getByText("Incorrect. Correct answer: A defined threshold that must be met before a pipeline stage can proceed")
  ).toBeVisible();
  await page.getByRole("button", { name: "Save and finish" }).click();

  await expect(page.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(page.getByText("Quiz complete.")).toBeVisible();
  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: expect.arrayContaining([
        expect.objectContaining({ questionId: "test-automation-strategy-011", status: "review", attempts: 1 })
      ])
    });

  // Idempotency: force-click Saved again, attempts must not increment
  await page.getByRole("button", { name: "Saved" }).click({ force: true });
  const progress = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey);
  const lastRecord = progress.records.find((r: { questionId: string }) => r.questionId === "test-automation-strategy-011");
  expect(lastRecord.attempts).toBe(1);
});

test("mock interview accepts an answer, reveals model guidance, and saves self-rating", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/mock-interview/python-coding");

  await page.getByPlaceholder("Write your answer as if you are speaking to an interviewer...").fill("I would validate contract and business fields.");
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

test("coding gym supports sandbox drafts, reveal controls, status save, and draft persistence", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/coding-gym");

  const firstTask = page.locator("article").filter({ hasText: "Find duplicate values" });
  await expect(firstTask.getByRole("heading", { name: "Answer sandbox" })).toBeVisible();
  await firstTask.getByPlaceholder("Write your python answer here...").fill("def find_duplicates(items):\n    return []");
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
});

test("home page has OpenGraph meta tags", async ({ page }) => {
  await page.goto("/");
  const ogTitle = page.locator('meta[property="og:title"]');
  const ogDesc = page.locator('meta[property="og:description"]');
  await expect(ogTitle).toHaveAttribute("content", /SDET Interview Trainer/);
  await expect(ogDesc).toHaveAttribute("content", /.+/);
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
  await expect(page.getByText("2/25 completed, 1 weak")).toBeVisible();
  await expect(page.getByText("8%").first()).toBeVisible();
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

// ── Security headers ─────────────────────────────────────────────────────────

test("responses include required security headers", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
});
