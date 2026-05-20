# SDET Interview Trainer

Target local project path:

```text
C:\Rufat_docs\Projects\interview_prep_app
```

## Purpose

SDET Interview Trainer is a responsive web app for technical interview preparation focused on:

- Mid-level QA Automation
- Senior SDET
- Coding confidence
- Python and Java coding practice
- Playwright, Selenium, API testing, SQL, CI/CD, AWS, and test automation strategy

The app is for personal use first, with a future path to a polished public/free version.

## MVP Summary

Build a responsive web app with:

- Next.js
- TypeScript
- Tailwind CSS
- Static JSON content
- localStorage progress tracking
- No login for MVP
- No AI integration for MVP

## First Batch Topics

1. Python Coding for QA/SDET
2. Java Coding for QA/SDET
3. SQL / PostgreSQL
4. Selenium
5. Playwright with Python
6. Playwright with TypeScript
7. API Testing
8. Test Automation Strategy
9. CI/CD for QA/SDET
10. AWS Basics for QA/SDET

## MVP Practice Modes

1. Flashcards
2. Quiz
3. Mock Interview
4. Coding Gym

## Development Approach

Start with the app shell and 3 sample questions per topic. After the UI and progress tracking work, expand each topic to 25 questions.

## Recommended Start Commands

From PowerShell:

```powershell
cd C:\Rufat_docs\Projects\interview_prep_app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*"
npm run dev
```

Then provide this folder to Codex and ask it to follow `CODEX_IMPLEMENTATION_PLAN.md`.
