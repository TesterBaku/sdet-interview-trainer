# App Architecture — SDET Interview Trainer

## Architecture Style

A static-first, client-rendered web app with no backend.

```text
Next.js (App Router)
  ↓
Static JSON content (250 questions, 10 topics)
  ↓
localStorage (per-question progress)
  ↓
Vercel Analytics (page-view telemetry only)
```

All data lives in the browser. Static content is bundled at build time; user progress is in localStorage.

## Main Modules

### 1. Content module

Loads and filters topics/questions from JSON.

```text
data/topics.json
data/questions/*.json        (10 files, 25 questions each)
lib/questionUtils.ts
```

Key exports in `lib/questionUtils.ts`:
- `topics`, `allQuestions` — static data
- `getTopic(topicId)`, `getQuestionsByTopic(topicId)`, `getQuestion(id)`
- `getFlashcardQuestions(topicId)`, `getQuizQuestions(topicId)`, `getInterviewQuestions(topicId)`
- `getCodingQuestions()`, `getCodingQuestionsByTopic(topicId)`
- `getWeakTopicIds(records)`
- `getDailyPlan(date?)` — deterministic per-UTC-day 10-item plan, 5 sections

### 2. Progress module

Reads/writes per-question progress to localStorage.

```text
lib/progress.ts
lib/storage.ts
types/Progress.ts
```

Key exports:
- `useProgress()` hook → `{ progress, isLoaded, updateQuestion }`
- `getRecord(progress, questionId)`
- `markQuestionStatus(progress, questionId, status)`
- `summarizeProgress(progress, questionIds?)` — totals + per-status counts + percentComplete; accepts a filtered ID list for per-type/per-topic summaries
- `summarizeTopicProgress(progress, topicId)`

### 3. Practice modes

| Route | Purpose |
|---|---|
| `/flashcards/[topicId]` | Reveal-answer flashcards, known/review/weak status, blocked Finish on last unmarked card |
| `/quiz/[topicId]`       | Single-choice MCQ with explanation, idempotent save, completion banner |
| `/mock-interview/[topicId]` | Textarea + 60–90s/4-step answer guide + reveal model answer + self-rate + Back to topic on last prompt |
| `/coding-gym`           | All coding tasks; `?topic=<id>` filters to one topic; sandbox draft auto-saves per task |

### 4. Aggregator surfaces

| Route | Purpose |
|---|---|
| `/`               | Home: hero + Daily Practice banner + 3-card grid + progress summary + weak topics |
| `/topics`         | All 10 topics with per-topic progress |
| `/topics/[topicId]` | Topic detail with 4–5 action cards (Coding Tasks card only shown if topic has coding questions) |
| `/daily-practice` | Today's 10-item rotating plan, 5 sections, completion tracker |
| `/review`         | All weak + review-later questions across topics, filterable by status/type/topic via URL query |
| `/progress`       | Overall + per-type (Coding / Quiz / Mock Interview) + per-topic breakdown |

### 5. Shared helpers

- `lib/practiceHref.ts` — `practiceHref(question)` maps a question to the right practice mode URL (used by `/review` and `/daily-practice`)
- `lib/codeWorkspace.ts` — per-question coding draft persistence

### 6. UI components

```text
Navigation         sticky top bar, 6 links (Home, Daily, Topics, Coding Gym, Review, Progress)
TopicCard          topic preview tile with progress
ProgressSummary    bar + 5-stat grid (Total/Completed/Known/Review/Weak)
QuestionCard       prompt container used by quiz and mock interview
Flashcard          card container for flashcard mode
QuizQuestion       MCQ option list + submit/save flow
CodingTaskCard     coding problem + sandbox + reveal hint/solution + status
StatusButtons      Known / Review / Weak buttons (shared)
PwaInit            registers service worker on first load
```

## Data flow

### Flashcard / Quiz / Mock Interview flow

```text
User opens practice mode
↓
Component loads filtered questions for the topic
↓
User answers / reveals / marks status
↓
useProgress.updateQuestion(id, status)
↓
markQuestionStatus → writeProgress (localStorage)
↓
State re-renders with new progress
```

### Coding Gym flow

```text
User opens /coding-gym (optionally with ?topic=<id>)
↓
getCodingQuestions() or getCodingQuestionsByTopic(topic.id)
↓
For each task: load draft via readCodeDraft(id)
↓
User edits sandbox → writeCodeDraft(id, text) on each keystroke
↓
User reveals hint/solution, then marks status
```

### Daily Practice flow

```text
User opens /daily-practice
↓
getDailyPlan(new Date()) → 5 sections of questions, seeded by UTC day
↓
For each item: getRecord(progress, id) → render status badge if marked
↓
User clicks item → practiceHref(question) routes to the right mode
```

### Review queue flow

```text
User opens /review (optionally with ?status= &type= &topic= )
↓
Filter progress.records to weak + review only
↓
Apply status/type/topic filters from URL (validated against known values)
↓
For each match: link via practiceHref(question)
```

## Storage strategy

localStorage key: `sdet-interview-trainer-progress`

Data shape:

```json
{
  "records": [
    {
      "questionId": "python-coding-001",
      "status": "known",
      "attempts": 2,
      "lastReviewedAt": "2026-05-21T00:00:00.000Z"
    }
  ],
  "completedQuestions": 1,
  "weakQuestions": 0,
  "reviewQuestions": 0
}
```

A second key per coding question stores the user's sandbox draft:
`sdet-interview-trainer-code-answer:<questionId>`

## SEO / security

- Per-page `<title>` and OpenGraph metadata via Next.js `metadata` / `generateMetadata` exports
- `app/sitemap.ts` generates 44 URLs (static + per-topic)
- `app/robots.ts` allows all crawlers, points to sitemap
- Security headers in `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `X-DNS-Prefetch-Control: on`

## Testing

`tests/functional/sdet-trainer.spec.ts` — 31 Playwright tests covering navigation, flashcard/quiz/mock-interview/coding-gym flows, mobile viewport overflow, SEO meta, sitemap/robots, security headers, daily practice stability, review queue filtering, and per-topic coding tasks.

CI runs lint → typecheck → all tests on every PR.

## Future architecture

Phase 2 candidates:

```text
Supabase or Firebase
Authentication
Cloud-synced progress
AI mock interview evaluation
Voice recording
Public content library
Admin content editor
Deep-link per-question (jump directly into the question marked weak)
```
