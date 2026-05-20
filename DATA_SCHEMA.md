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
