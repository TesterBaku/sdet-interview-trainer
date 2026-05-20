# App Architecture — SDET Interview Trainer

## Architecture Style

The MVP is a static-first responsive web app.

```text
Next.js UI
  ↓
Static JSON content
  ↓
localStorage progress
```

No backend is required for MVP.

## Main Modules

### 1. Content Module

Responsible for:

- Loading topics
- Loading questions
- Filtering questions by topic
- Filtering questions by type

Files:

```text
data/topics.json
data/questions/*.json
lib/questionUtils.ts
```

### 2. Progress Module

Responsible for:

- Reading progress from localStorage
- Writing progress to localStorage
- Marking question status
- Calculating progress summaries

Files:

```text
lib/progress.ts
lib/storage.ts
types/Progress.ts
```

### 3. Practice Modes

Responsible for:

- Flashcards
- Quiz
- Mock Interview
- Coding Gym

Routes:

```text
/flashcards/[topicId]
/quiz/[topicId]
/mock-interview/[topicId]
/coding-gym
```

### 4. UI Components

Reusable components:

```text
Navigation
TopicCard
ProgressSummary
QuestionCard
Flashcard
QuizQuestion
CodingTaskCard
StatusButtons
```

## Data Flow

### Flashcard Flow

```text
User opens topic
↓
App loads topic questions
↓
User reveals answer
↓
User marks status
↓
Status saved to localStorage
↓
Progress updates
```

### Quiz Flow

```text
User opens quiz
↓
App loads quiz questions
↓
User selects answer
↓
App checks correctAnswer
↓
App shows explanation
↓
Progress saved
```

### Coding Gym Flow

```text
User opens Coding Gym
↓
App loads all coding questions
↓
User opens task
↓
User reveals hint/solution
↓
User marks status
```

## Storage Strategy

Use localStorage key:

```text
sdet-interview-trainer-progress
```

Data shape:

```json
{
  "records": [
    {
      "questionId": "python-coding-001",
      "status": "known",
      "attempts": 2,
      "lastReviewedAt": "2026-05-20T00:00:00.000Z"
    }
  ]
}
```

## Future Architecture

Phase 2 can add:

```text
Supabase or Firebase
Authentication
Cloud-synced progress
AI mock interview evaluation
Voice recording
Public content library
Admin content editor
```
