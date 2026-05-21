# Content Plan — SDET Interview Trainer

> **Status (2026-05-21):** ✅ **Content complete.** All 10 topics shipped with 25 questions each (250 total). This document is preserved as a reference for question themes and structure.

## Content Strategy

Originally: build the app first with 3 sample questions per topic, then expand.

Outcome: shipped MVP with 3 questions per topic in `4ec0e6a Initial SDET interview trainer MVP`, then expanded to 25/topic across PRs #2 and #5.

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

## Final Content Goal

```text
10 topics × 25 questions = 250 questions
```

## Initial Content Goal

```text
10 topics × 3 questions = 30 questions
```

## Coding Split

Coding content should be split between Python and Java.

Recommended split:

```text
Python Coding: 25 questions
Java Coding: 25 questions
```

C#/.NET should move to Phase 2.

## Content Format Per Interview Question

Each interview question should include:

1. Question
2. Short answer
3. Interview-ready answer
4. Real project example
5. Follow-up questions
6. Tags
7. Difficulty

## Content Format Per Coding Question

Each coding task should include:

1. Title
2. Problem
3. Input example
4. Expected output
5. Hint
6. Solution
7. Explanation
8. Common mistakes
9. Follow-up questions
10. Difficulty

## Recommended Content Build Order

### Batch 1

1. Python Coding
2. Java Coding
3. SQL / PostgreSQL

Reason: coding is the biggest weakness to improve.

### Batch 2

4. Playwright TypeScript
5. Playwright Python
6. Selenium

Reason: automation-specific technical interviews.

### Batch 3

7. API Testing
8. Test Automation Strategy

Reason: core SDET expectations.

### Batch 4

9. CI/CD
10. AWS

Reason: differentiates from regular QA candidates.

## Python Coding Question Themes

Include:

- strings
- lists
- dictionaries
- sets
- loops
- functions
- JSON parsing
- file reading
- API response validation
- test utility functions
- data comparison
- pytest-style helper functions

## Java Coding Question Themes

Include:

- strings
- arrays
- ArrayList
- HashMap
- HashSet
- loops
- methods
- simple classes
- JSON-like map validation
- Selenium utility-style methods
- API validation helpers
- basic OOP interview concepts

## SQL Question Themes

Include:

- SELECT
- WHERE
- GROUP BY
- HAVING
- JOIN
- duplicates
- latest record per group
- NULL handling
- aggregation
- test data validation scenarios

## Playwright TypeScript Themes

Include:

- locator vs ElementHandle
- getByRole
- auto-waiting
- assertions
- fixtures
- Page Object Model
- APIRequestContext
- trace viewer
- retries
- CI execution

## Playwright Python Themes

Include:

- sync vs async API
- locators
- pytest integration
- fixtures
- API testing
- browser/context/page
- waits
- screenshots/traces
- Page Object Model

## Selenium Themes

Include:

- WebDriver
- locators
- waits
- stale element
- iframe
- alerts
- windows/tabs
- Page Object Model
- test framework design
- flaky test handling

## API Testing Themes

Include:

- REST basics
- status codes
- headers
- authentication
- JSON schema
- contract testing
- positive/negative testing
- idempotency
- retries
- test data setup

## Test Automation Strategy Themes

Include:

- test pyramid
- framework design
- maintainability
- flaky tests
- CI gates
- test selection
- test data
- reporting
- ownership
- ROI of automation

## CI/CD Themes

Include:

- pipeline stages
- smoke tests
- regression tests
- parallel execution
- test reports
- flaky tests
- environment variables
- secrets
- build failures
- quality gates

## AWS Themes

Include:

- S3
- Lambda
- ECS/Fargate
- CloudWatch
- IAM basics
- environment variables
- logs
- test data in cloud
- deployment validation
- cloud testing strategy
