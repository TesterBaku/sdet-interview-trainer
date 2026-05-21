# SDET Interview Trainer

QA Automation / SDET interview practice app — flashcards, quizzes, mock interviews, coding tasks, plus a daily focused plan and a global review queue.

**Live:** https://sdet-interview-trainer.vercel.app

## Tech stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS
- Static JSON content (no backend)
- localStorage for progress
- `@vercel/analytics` for page-view tracking
- PWA-installable (manifest + service worker)
- Playwright for functional tests
- GitHub Actions CI (lint → typecheck → 31 Playwright tests on every PR)

## Features

**10 topics, 250 questions (25 per topic):**
Python Coding · Java Coding · SQL / PostgreSQL · Selenium · Playwright (Python & TypeScript) · API Testing · Test Automation Strategy · CI/CD · AWS

**Practice modes (4):** Flashcards · Quiz · Mock Interview · Coding Gym
**Aggregator pages (4):** Daily Practice · Topics · Review Queue · Progress

| Route | Purpose |
|---|---|
| `/daily-practice` | A 10-item daily mix that rotates every UTC day (3 coding · 2 SQL · 2 Playwright/Selenium · 2 API/CI/AWS · 1 strategy) |
| `/topics` and `/topics/[topicId]` | Browse topics, see per-topic progress, jump into any practice mode |
| `/flashcards/[topicId]` | Reveal-answer flashcards with known/review/weak status |
| `/quiz/[topicId]` | Multiple choice with explanations and correctness feedback |
| `/mock-interview/[topicId]` | Type an answer, get a 60–90s structure guide, reveal model answer, self-rate |
| `/coding-gym` | All coding tasks; supports `?topic=<id>` to scope to one topic |
| `/review` | Global queue of all questions marked weak or review-later, with status/type/topic filters |
| `/progress` | Overall + per-type (coding / quiz / mock interview) + per-topic breakdowns |

## Local development

```powershell
git clone https://github.com/TesterBaku/sdet-interview-trainer
cd sdet-interview-trainer
npm install
npm run dev
```

Open http://localhost:3000.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build + typecheck |
| `npm run lint` | ESLint (zero warnings policy) |
| `npm run test:functional` | Run all Playwright tests headlessly |

### CI / regression

Every pull request and every push to `main` runs `.github/workflows/regression.yml`:
1. `npm install`
2. `npx playwright install --with-deps chromium`
3. `npm run lint` (max-warnings=0)
4. `npx tsc --noEmit`
5. `npm run test:functional` (31 tests)

A green CI is required to merge.

## Deployment

Vercel auto-deploys `main` to the production URL above. PR previews are generated automatically for every branch.

## Repository layout

```text
app/
  page.tsx + HomeClient.tsx            home with Daily Practice banner
  topics/                              topic list + detail
  flashcards/[topicId]/                flashcard mode
  quiz/[topicId]/                      quiz mode
  mock-interview/[topicId]/            mock interview mode
  coding-gym/                          coding tasks (supports ?topic=)
  daily-practice/                      today's 10-item plan
  review/                              global weak/review queue
  progress/                            progress breakdown
  layout.tsx                           root layout, SEO, Analytics
  sitemap.ts                           dynamic sitemap (46 URLs: 6 static + 10 topics × 4)
  robots.ts                            robots.txt
  manifest.ts, icon.tsx, apple-icon.tsx  PWA assets

components/                            reusable UI primitives
data/
  topics.json                          10 topic definitions
  questions/*.json                     250 questions across 10 files
lib/
  questionUtils.ts                     content access + daily plan
  progress.ts                          progress hooks + summaries
  practiceHref.ts                      question → practice mode mapping
  storage.ts                           localStorage read/write
  codeWorkspace.ts                     coding gym draft persistence
types/                                 Topic / Question / Progress
tests/functional/                      Playwright spec
.github/workflows/regression.yml       CI
next.config.ts                         security headers
```

## Documentation files

| File | Purpose | Status |
|---|---|---|
| `README.md` | This file — current state of the app | Active |
| `APP_ARCHITECTURE.md` | Module overview, routes, data flow | Active |
| `DATA_SCHEMA.md` | TypeScript types for Topic / Question / Progress | Active |
| `PROJECT_REQUIREMENTS.md` | Original product requirements | Active reference |
| `CONTENT_PLAN.md` | Content build plan | Complete (250/250 questions shipped) |
| `MVP_ROADMAP.md` | Phase plan from build kickoff | Phases 0-6 complete |
| `CODEX_IMPLEMENTATION_PLAN.md` | Pre-build setup steps | Historical — kept for reference |
| `START_HERE.md` | Pre-build setup steps | Historical — kept for reference |
| `AGENTS.md` | Working agreements for agent-assisted development | Active |
