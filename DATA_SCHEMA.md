# Data Schema — SDET Interview Trainer

## Topic Type

```ts
export type Topic = {
  id: string;
  title: string;
  description: string;
  category: "coding" | "automation" | "cloud" | "strategy" | "database";
  questionCount: number;
  difficulty: "mid" | "senior" | "mixed";
};
```

## Question Type

```ts
export type Question = {
  id: string;
  topicId: string;
  topicTitle: string;
  level: "mid" | "senior";
  type: "interview" | "quiz" | "coding" | "scenario";
  difficulty: "easy" | "medium" | "hard";

  question: string;

  shortAnswer?: string;
  interviewAnswer?: string;
  realProjectExample?: string;
  followUps?: string[];

  choices?: string[];
  correctAnswer?: string;
  explanation?: string;

  title?: string;
  problem?: string;
  inputExample?: string;
  expectedOutput?: string;
  hint?: string;
  solutionLanguage?: "python" | "java" | "typescript" | "sql";
  solution?: string;
  commonMistakes?: string[];

  tags: string[];
};
```

## CheatSheet Type

Cheat sheets are a self-contained content set, separate from the topic/question system. They are
generated from the source HTML study pages by `scripts/build-cheatsheets.mjs` into
`data/cheatsheets/<id>.json` and loaded via `lib/cheatsheets.ts`.

```ts
export type CheatSheetSection = { id: string; title: string; bodyHtml: string };
export type CheatSheetGroup = "Test Frameworks" | "API & Data" | "DevOps & CI" | "Languages";
export type CheatSheet = {
  id: string;            // "sql"
  title: string;         // "SQL"
  group: CheatSheetGroup;
  accent: string;        // hex accent for the card stripe
  summary: string;       // standfirst
  tags: string[];        // chip list
  sections: CheatSheetSection[];  // bodyHtml is sanitized HTML rendered in .cheatsheet-prose
  quiz: Question[];      // type:"quiz" items; ids namespaced cs-<sheet>-NNN
};
```

Quiz items reuse the `Question` type so the existing `QuizQuestion` component and `useProgress`
hook work unchanged. Their ids (`cs-sql-001`, …) are intentionally NOT part of `allQuestions`, so
cheat-sheet quiz progress is tracked in localStorage but excluded from the main `/progress` totals.

A cheat sheet may set `mockExamId` instead of an inline quiz (`quiz: []`); its self-test is then a
dedicated Mock Exam (see below) reached via `/mock-exam/<id>`. The CCA Foundations sheet uses this.

## MockExam Type

A dedicated, session-scored certification exam (distinct from the per-sheet quizzes). Generated from
the source HTML by `scripts/build-cca-exam.mjs` into `data/mock-exams/<id>.json`, loaded via
`lib/mockExams.ts`, rendered by `app/mock-exam/[examId]/MockExamClient.tsx`.

```ts
export type MockExamDomain = { id: number; label: string; weight: string };
export type MockExamQuestion = {
  id: number; domain: number; text: string;
  options: string[]; correct: number; // index into options
  explanation: string;                // inline HTML (<strong>/<code>/<br>)
};
export type MockExam = {
  id: string; title: string; description: string;
  passThreshold: number;              // percent, e.g. 70
  domains: MockExamDomain[]; questions: MockExamQuestion[];
};
```

The exam is scored in-session (React state, not localStorage): answer reveals the explanation, Submit
shows overall % vs `passThreshold`, pass/fail, and a per-domain breakdown.

## Progress Types

```ts
export type QuestionStatus = "new" | "known" | "review" | "weak";

export type ProgressRecord = {
  questionId: string;
  status: QuestionStatus;
  attempts: number;
  lastReviewedAt: string;
};

export type AppProgress = {
  records: ProgressRecord[];
  completedQuestions: number;
  weakQuestions: number;
  reviewQuestions: number;
};
```

## Topic JSON Example

```json
{
  "id": "playwright-typescript",
  "title": "Playwright with TypeScript",
  "description": "Playwright TypeScript interview questions, test runner usage, fixtures, locators, and CI execution.",
  "category": "automation",
  "questionCount": 25,
  "difficulty": "mixed"
}
```

## Interview Question Example

```json
{
  "id": "playwright-typescript-001",
  "topicId": "playwright-typescript",
  "topicTitle": "Playwright with TypeScript",
  "level": "mid",
  "type": "interview",
  "difficulty": "easy",
  "question": "What is the difference between page.locator() and page.$() in Playwright?",
  "shortAnswer": "page.locator() creates a Locator with auto-waiting and retry behavior. page.$() returns an ElementHandle and does not provide the same retry-friendly behavior.",
  "interviewAnswer": "In Playwright TypeScript, I prefer page.locator() because it supports auto-waiting, retryable assertions, and better stability for modern UI automation.",
  "realProjectExample": "For a login test, I would use getByRole or locator to interact with fields because Playwright waits for elements to be actionable before performing actions.",
  "followUps": [
    "Why are locators better for dynamic pages?",
    "What does auto-waiting mean?",
    "When would you use getByRole instead of CSS selectors?"
  ],
  "tags": ["playwright", "typescript", "locator"]
}
```

## Coding Question Example

```json
{
  "id": "python-coding-001",
  "topicId": "python-coding",
  "topicTitle": "Python Coding for QA/SDET",
  "level": "mid",
  "type": "coding",
  "difficulty": "easy",
  "title": "Find duplicate values in a list",
  "question": "Write a function that returns duplicate values from a list.",
  "problem": "Given a list of values, return the values that appear more than once.",
  "inputExample": "[1, 2, 3, 2, 4, 1]",
  "expectedOutput": "[1, 2]",
  "hint": "Use a set to track values already seen.",
  "solutionLanguage": "python",
  "solution": "def find_duplicates(items):\n    seen = set()\n    duplicates = []\n\n    for item in items:\n        if item in seen and item not in duplicates:\n            duplicates.append(item)\n        else:\n            seen.add(item)\n\n    return duplicates",
  "explanation": "The function tracks values already seen. When a value appears again, it is added to the duplicates list only once.",
  "commonMistakes": [
    "Returning the same duplicate more than once",
    "Using nested loops when a set is simpler",
    "Not handling an empty list"
  ],
  "followUps": [
    "What is the time complexity?",
    "How would you preserve order?",
    "How would you solve this in Java?"
  ],
  "tags": ["python", "list", "set", "duplicates"]
}
```
