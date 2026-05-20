# Lessons

- Flashcard reveal must render answer content for every supported question type. Coding questions use `solution`, `hint`, `expectedOutput`, `explanation`, and `commonMistakes`; quiz questions use `correctAnswer` and `explanation`; interview/scenario questions use `shortAnswer`, `interviewAnswer`, and `realProjectExample`.
- Quiz completion must preserve correctness in progress. Correct answers can become `known`; incorrect answers should not be marked as known, and final-question saves must become idempotent so attempts are not inflated by repeat clicks.
