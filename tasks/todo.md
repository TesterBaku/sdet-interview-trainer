# MVP Implementation Checklist

## Scope

Build the SDET Interview Trainer MVP from `CODEX_IMPLEMENTATION_PLAN.md` using Next.js, TypeScript, Tailwind CSS, static JSON content, and localStorage progress tracking.

## Checklist

- [ ] Add functional regression test suite for core user flows.
- [ ] Fix any bugs exposed by functional tests.
- [ ] Create private GitHub repository and push initial baseline.
- [ ] Use PR-based workflow after initial push; never merge directly for future work.
- [x] Scaffold Next.js app with TypeScript, Tailwind, ESLint, App Router, and `@/*` alias.
- [x] Create documented folder structure for routes, components, data, lib utilities, and types.
- [x] Implement `Topic`, `Question`, and progress TypeScript types from `DATA_SCHEMA.md`.
- [x] Add `topics.json` with all 10 MVP topics.
- [x] Add 10 question JSON files with 3 sample questions per topic and mixed question types.
- [x] Implement question loading and filtering utilities.
- [x] Implement localStorage helpers and progress summary calculations.
- [x] Build responsive navigation for Home, Topics, Coding Gym, and Progress.
- [x] Build home dashboard with continue practice, weak topics, coding gym, mock interview, and progress summary cards.
- [x] Build topics page with progress-aware topic cards.
- [x] Build topic detail page with practice mode links and progress.
- [x] Build flashcard mode with answer reveal and known/review/weak status saving.
- [x] Build quiz mode with choices, submit, result, explanation, and next question.
- [x] Build mock interview mode with textarea, model answer, checklist, and self-rating.
- [x] Build coding gym with all coding tasks, examples, hints, solutions, mistakes, follow-ups, and status saving.
- [x] Build progress page with total, completed, known, review, weak, and per-topic progress.
- [x] Verify local build/lint behavior and record results.
- [x] Add a non-executing coding answer sandbox with per-question localStorage drafts.

## Review

Implemented the MVP as a static-first Next.js app with TypeScript, Tailwind CSS, JSON-backed content, and localStorage-backed progress.

Functional test pass checklist:

- [x] Home page renders dashboard cards and navigation.
- [x] Topics page renders all 10 topics.
- [x] Topic detail page exposes Flashcards, Quiz, Mock Interview, and Review Weak Questions actions.
- [ ] Flashcard reveal displays answer content and status buttons.
- [ ] Quiz flow records correct/incorrect progress appropriately and final save is not repeatable.
- [ ] Mock interview flow accepts typed answer, reveals model answer, checklist, and self-rating.
- [x] Coding Gym shows tasks and answer sandbox fields.
- [ ] Coding Gym hint, solution, status buttons, and sandbox persistence.
- [ ] Progress page reflects localStorage updates.

Functional test notes:

- Browser route/navigation testing passed for Home, Topics, Topic Detail, Flashcards route load, Quiz route load, and Coding Gym route load.
- Static rendered content looked correct for Home, Topics, Topic Detail, Quiz, Flashcards, and Coding Gym.
- Functional blocker observed in Chrome DevTools session against `http://127.0.0.1:3000`: React-controlled interactions did not update state. Examples: Flashcard `Reveal answer` did not reveal answer content; Quiz radio selection checked the native input but did not enable Submit; Coding Gym textarea fill did not update char count/localStorage. Native links navigated correctly.
- During investigation, Flashcards and Coding Gym pages were refactored into server page wrappers plus explicit client components, and localStorage hooks were simplified. Lint/build/type checks still passed, and independent reviewer reported no findings on that refactor.

Post-review quiz progress fix:

- Incorrect quiz answers now save as `review` instead of `known`.
- Final quiz questions can only be saved once after submission, preventing inflated attempt counts.
- Independent reviewer reported no findings for the quiz-progress patch.

Coding answer sandbox:

- Added a non-executing textarea workspace to each coding task.
- Draft answers save per question in localStorage and can be cleared.
- Independent reviewer reported no findings for the sandbox patch.

Verification completed:

- `npm.cmd run lint` passed.
- `npx.cmd tsc --noEmit` passed.
- `npm.cmd run build` passed.
- Local HTTP route checks returned `200` for `/`, `/topics`, `/topics/python-coding`, `/flashcards/python-coding`, `/quiz/python-coding`, `/mock-interview/python-coding`, `/coding-gym`, and `/progress`.

Notes:

- `npm audit` could not complete because the registry audit endpoint returned an error. `npm install` still reports 2 moderate vulnerabilities; review with `npm audit` when the registry endpoint is available.
- Chrome DevTools browser automation could not connect to the Windows localhost server from its environment, while PowerShell HTTP checks could. This appears to be an environment bridge issue, not a build/runtime failure.
