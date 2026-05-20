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
  await expect(page.getByText("30")).toBeVisible();

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

  await expect(page.getByText("Card 1 of 2")).toBeVisible();
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
  await expect(page.getByText("Card 2 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Reveal answer" }).click();
  await expect(page.getByText("Short answer")).toBeVisible();
  await expect(page.getByText("Validate required structure and business-critical fields", { exact: false })).toBeVisible();
});

test("quiz preserves correctness and final save is idempotent", async ({ page }) => {
  await clearAppState(page);
  await page.goto("/quiz/python-coding");

  await page.getByLabel("list").check();
  await expect(page.getByRole("button", { name: "Submit answer" })).toBeEnabled();
  await page.getByRole("button", { name: "Submit answer" }).click();
  await expect(page.getByText("Incorrect. Correct answer: set")).toBeVisible();
  await page.getByRole("button", { name: "Save and finish" }).click();

  await expect(page.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(page.getByText("Quiz complete.")).toBeVisible();
  await expect
    .poll(async () => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey))
    .toMatchObject({
      records: [{ questionId: "python-coding-002", status: "review", attempts: 1 }],
      reviewQuestions: 1
    });

  await page.getByRole("button", { name: "Saved" }).click({ force: true });
  const progress = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "{}"), progressKey);
  expect(progress.records).toHaveLength(1);
  expect(progress.records[0].attempts).toBe(1);
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
  await expect(page.getByText("2/3 completed, 1 weak")).toBeVisible();
  await expect(page.getByText("67%").first()).toBeVisible();
});
