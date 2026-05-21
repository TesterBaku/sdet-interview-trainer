# MVP Roadmap — SDET Interview Trainer

Status as of 2026-05-21 — MVP shipped, app live at https://sdet-interview-trainer.vercel.app.

## ✅ Phase 0 — Preparation

Created local folder, placed docs, initialized Next.js app.

## ✅ Phase 1 — App Skeleton

- Next.js 16 + TypeScript + Tailwind
- Navigation
- Home page
- Topics page
- Static topics JSON

## ✅ Phase 2 — Topic Detail and Content Loading

- Topic detail page with 4–5 action cards
- Question loading utilities (`lib/questionUtils.ts`)
- Sample data files for all 10 topics

## ✅ Phase 3 — Practice Modes

- Flashcard mode (with last-card blocking until marked)
- Quiz mode (with idempotent save, completion banner)
- Mock Interview mode (with 60–90s answer guide, Back-to-topic on last prompt)
- Coding Gym (with sandbox draft persistence)

## ✅ Phase 4 — Progress Tracking

- localStorage progress (`sdet-interview-trainer-progress`)
- known/review/weak status
- Progress summary component
- Topic progress percentage

## ✅ Phase 5 — Content Expansion

All 10 topics shipped with 25 questions each = **250 questions total.**

## ✅ Phase 6 — Polish (delivered post-MVP)

- ✅ Mobile responsive design across all pages
- ✅ Progressive Web App (installable manifest + service worker)
- ✅ SEO (per-page titles, OpenGraph, Twitter Card, sitemap, robots.txt)
- ✅ Vercel Analytics for page-view tracking
- ✅ HTTP security headers (XFO, nosniff, Referrer-Policy, Permissions-Policy)
- ✅ Per-topic Coding Tasks shortcut from Topic Detail (`/coding-gym?topic=`)
- ✅ Global Review Queue at `/review` with status/type/topic filters
- ✅ Daily Practice mode at `/daily-practice` — 10 items rotating per UTC day
- ✅ Playwright regression suite (31 tests) running on every PR
- ⏸ Search — not needed yet, content is small and well-organized
- ⏸ Difficulty labels in the UI — data has `difficulty` field but it isn't exposed in the UI yet
- ⏸ Bookmarks (separate from weak/review) — review queue covers the main use case
- ⏸ Export/import progress — not requested

## ⏭ Phase 7 — Future Public Version (not started)

These intentionally remain out of scope while the app is for personal use:

- Login
- Cloud database with cross-device sync
- AI answer evaluation
- Voice interview practice
- Resume/job-description upload
- Public content library
- Admin content editor
- Deep-link to a specific question from the review queue or daily plan
