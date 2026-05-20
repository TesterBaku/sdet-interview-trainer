# Project Requirements — SDET Interview Trainer

## Product Goal

Build a personal technical interview preparation app for QA Automation and SDET interviews.

The app should improve:

1. Coding confidence
2. Interview answer structure
3. Test automation framework design thinking
4. Playwright and Selenium readiness
5. API testing and SQL readiness
6. CI/CD and AWS interview readiness
7. Mock interview practice

## Target User

Primary user: Rufat

Future users:

- QA Automation Engineers
- SDETs
- Manual QAs transitioning to automation
- Mid-level QA engineers preparing for senior roles

## Interview Level

The MVP should target:

- Mid-level QA Automation
- Senior SDET

Avoid making the first version too junior or too principal-heavy.

## Main Weakness to Solve

The app should prioritize coding practice.

Coding content should be split between:

- Python
- Java

C#/.NET should not be included in the first coding batch. It can be added in Phase 2.

## MVP Topic List

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

## Question Count Goal

Final content goal:

```text
10 topics × 25 questions = 250 questions
```

Initial implementation goal:

```text
10 topics × 3 sample questions = 30 questions
```

## Required Practice Modes

### Flashcard Mode

User should be able to:

- Read a question
- Reveal answer
- Mark the question as known, review, or weak
- Move to next question

### Quiz Mode

User should be able to:

- Answer multiple-choice questions
- Submit answer
- See correct/incorrect result
- See explanation
- Move to next question

### Mock Interview Mode

User should be able to:

- Read interview question
- Type their answer
- Reveal model answer
- See checklist
- Self-rate answer

No AI evaluation in MVP.

### Coding Gym

User should be able to:

- View coding problems
- See input/output examples
- Reveal hints
- Reveal solution
- Read explanation
- Review common mistakes
- See follow-up variations

No live code execution in MVP.

## Progress Tracking

Use browser `localStorage`.

Each question should support these statuses:

- new
- known
- review
- weak

The app should show:

- Completed questions
- Known questions
- Review questions
- Weak questions
- Topic completion percentage
