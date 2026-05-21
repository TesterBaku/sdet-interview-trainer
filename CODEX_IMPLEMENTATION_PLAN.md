# Codex Implementation Plan — SDET Interview Trainer

> **Status (2026-05-21):** ✅ **Historical — all steps complete.** This was the original kickoff plan used to scaffold the project. Kept here for reference. For the current state of the app, see [README.md](README.md) and [APP_ARCHITECTURE.md](APP_ARCHITECTURE.md).


## Local Project Path

```text
C:\Rufat_docs\Projects\interview_prep_app
```

## Goal

Build a responsive web app called **SDET Interview Trainer** for QA Automation / SDET interview preparation.

## Tech Stack

Use:

- Next.js
- TypeScript
- Tailwind CSS
- Static JSON files
- localStorage
- No authentication
- No backend for MVP

## Step 1 — Initialize Project

From PowerShell:

```powershell
mkdir "C:\Rufat_docs\Projects\interview_prep_app"
cd "C:\Rufat_docs\Projects\interview_prep_app"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*"
npm run dev
```

## Step 2 — Create Folder Structure

Create:

```text
app/
  page.tsx
  topics/
    page.tsx
    [topicId]/
      page.tsx
  flashcards/
    [topicId]/
      page.tsx
  quiz/
    [topicId]/
      page.tsx
  mock-interview/
    [topicId]/
      page.tsx
  coding-gym/
    page.tsx
  progress/
    page.tsx

components/
  Navigation.tsx
  TopicCard.tsx
  ProgressSummary.tsx
  QuestionCard.tsx
  Flashcard.tsx
  QuizQuestion.tsx
  CodingTaskCard.tsx
  StatusButtons.tsx

data/
  topics.json
  questions/
    python-coding.json
    java-coding.json
    sql-postgresql.json
    selenium.json
    playwright-python.json
    playwright-typescript.json
    api-testing.json
    test-automation-strategy.json
    cicd.json
    aws.json

lib/
  progress.ts
  questionUtils.ts
  storage.ts

types/
  Topic.ts
  Question.ts
  Progress.ts
```

## Step 3 — Implement Types

Create TypeScript types for:

- Topic
- Question
- ProgressRecord
- AppProgress

Use `DATA_SCHEMA.md` as the source of truth.

## Step 4 — Implement Static Data

Create `data/topics.json`.

Create 10 question files under `data/questions`.

Each topic should initially have 3 sample questions.

Question types should include a mix of:

- interview
- quiz
- coding
- scenario

## Step 5 — Implement Navigation

Navigation should include:

- Home
- Topics
- Coding Gym
- Progress

Use a clean responsive layout.

## Step 6 — Home Dashboard

Home page should show:

- App title
- Short description
- Continue practice card
- Weak topics card
- Coding Gym card
- Mock Interview card
- Progress summary

## Step 7 — Topics Page

Topics page should show all topic cards.

Each card should display:

- title
- description
- category
- question count
- progress percentage
- start button

## Step 8 — Topic Detail Page

For selected topic, show:

- title
- description
- progress
- buttons:
  - Flashcards
  - Quiz
  - Mock Interview
  - Review Weak Questions

## Step 9 — Flashcard Mode

Flashcard mode should:

- Load questions by topic
- Show one question at a time
- Hide answer until user clicks reveal
- Show short answer, interview answer, real project example, and follow-ups
- Allow marking question as:
  - known
  - review
  - weak
- Save status in localStorage

## Step 10 — Quiz Mode

Quiz mode should:

- Load quiz-compatible questions for topic
- Show choices
- Allow selecting one answer
- Show explanation after submit
- Move to next question

## Step 11 — Mock Interview Mode

Mock interview mode should:

- Show interview/scenario questions
- Provide textarea for user answer
- Reveal model answer
- Show checklist:
  - Did I answer directly?
  - Did I mention tools?
  - Did I give a real example?
  - Did I explain tradeoffs?
  - Did I avoid rambling?
- Allow self-rating:
  - weak
  - acceptable
  - strong

## Step 12 — Coding Gym

Coding Gym should show all coding tasks from:

- Python Coding
- Java Coding
- SQL/PostgreSQL
- Playwright Python
- Playwright TypeScript
- Selenium
- API Testing

Each task should show:

- problem
- input example
- expected output
- hint
- solution
- explanation
- common mistakes
- follow-ups

No live code execution required.

## Step 13 — Progress Page

Progress page should calculate from localStorage:

- total questions
- completed questions
- known questions
- review questions
- weak questions
- progress by topic

## Step 14 — Responsive UI

Design should work well on:

- laptop
- tablet
- mobile

Style direction:

- clean professional dashboard
- flashcard trainer
- coding prep interface
- simple, focused, minimal clutter

## Acceptance Criteria

The app is complete for MVP when:

1. It runs locally with `npm run dev`.
2. It shows all 10 topics.
3. Topic pages work.
4. Flashcard mode works.
5. Quiz mode works.
6. Mock interview mode works.
7. Coding Gym works.
8. Progress saves to localStorage.
9. Progress page displays useful stats.
10. Layout is usable on mobile and desktop.

## Not Required in MVP

Do not implement:

- Login
- Backend database
- AI tutor
- Voice mode
- Code execution
- Payments
- Public profiles
