# SDET Interview Trainer

QA Automation / SDET interview practice app — flashcards, quizzes, mock interviews, coding tasks, plus a daily focused plan and a global review queue.

**Live:** https://sdet-interview-trainer.vercel.app

## Tech stack

- Next.js 16 (App Router) + React 19
- TypeScript
- Tailwind CSS
- Static JSON content (no backend)
- localStorage for progress
- Self-owned study audio: local neural TTS (Kokoro) → Vercel Blob hosting
- `@vercel/analytics` for page-view tracking
- PWA-installable (manifest + service worker)
- Playwright for functional tests
- GitHub Actions CI (lint → typecheck → 31 Playwright tests on every PR)

## Features

**11 topics, 525 questions:**
Python Coding · Java Coding · SQL / PostgreSQL · Selenium · Playwright (Python & TypeScript) · API Testing · REST Assured · Test Automation Strategy · CI/CD · AWS

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
| `/cheatsheets` and `/cheatsheets/[id]` | Per-topic cheat sheets — each with a **Listen** podcast player (audio + synced transcript) when audio is published |
| `/commute` | **Commute Mode** — a screen-free playlist that queues the study-audio episodes back to back |

## Study audio (podcast)

Each cheat-sheet topic has a **standalone two-host podcast episode** (in the style of
NotebookLM's Audio Overview) — a real conversation between two hosts that teaches the topic
screen-free, sized to cover the main interview questions. 18 topics, ~4.25 hours total. They
surface as a **Listen** player on each cheat-sheet page and as a **Commute Mode** playlist.

Unlike a black-box tool, the whole pipeline is **self-owned and offline**: scripts are
committed, human-editable text (the patchable source of truth), rendered locally with neural
TTS (Kokoro, Apache-2.0 — no third-party API, no per-use cost), and hosted on our own Vercel
Blob. Only changed episodes re-render/re-upload (content-hash gated), and every episode ships
with a transcript for accessibility + SEO.

See [`docs/audio-pipeline.md`](docs/audio-pipeline.md) for the full authoring → synthesis →
publish workflow.

## Install as an app (PWA)

The trainer is a Progressive Web App, so you can install it on any device and launch it from your home screen or dock like a native app. Once installed, the core screens keep working offline (a service worker pre-caches the app shell). In-app, an **Install app** button appears when your browser supports it; you can also install manually:

| Platform | How to install |
|---|---|
| **Chrome / Edge (desktop)** | Open the [live app](https://sdet-interview-trainer.vercel.app), then click the install icon in the address bar (a monitor with a down-arrow) — or use the ⋮ menu → **Install SDET Interview Trainer**. |
| **Android (Chrome)** | Open the app, tap the ⋮ menu → **Install app** / **Add to Home screen**. |
| **iOS / iPadOS (Safari)** | Open the app in Safari, tap the **Share** button, then **Add to Home Screen**. (Safari doesn't show an automatic prompt, so this manual step is required.) |

To uninstall, remove it like any app: on desktop use the app's ⋮ menu → **Uninstall**; on mobile long-press the home-screen icon → **Remove** / **Uninstall**.

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
| `npm run test:unit` | Node unit tests for the audio text transforms |
| `npm run audio:podcast:captions` | Build transcripts + WebVTT from rendered podcast episodes |
| `npm run audio:podcast:publish` | Upload changed episodes to Vercel Blob + update the manifest (needs `BLOB_READ_WRITE_TOKEN`) |

Rendering episodes and the full authoring loop live in [`docs/audio-pipeline.md`](docs/audio-pipeline.md).

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
  sitemap.ts                           dynamic sitemap (static routes + 4 per topic + cheat sheets + mock exams)
  robots.ts                            robots.txt
  manifest.ts, icon.tsx, apple-icon.tsx  PWA assets

components/                            reusable UI primitives
data/
  topics.json                          11 topic definitions
  questions/*.json                     525 questions across 11 files
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

| File | Purpose |
|---|---|
| `README.md` | This file — current state of the app |
| `APP_ARCHITECTURE.md` | Module overview, routes, data flow, storage shape |
| `DATA_SCHEMA.md` | TypeScript types for Topic / Question / Progress |
| `AGENTS.md` | Working agreements for agent-assisted development |
