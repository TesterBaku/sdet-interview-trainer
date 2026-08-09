export type QuestionStatus = "new" | "known" | "review" | "weak";

export type ProgressRecord = {
  questionId: string;
  status: QuestionStatus;
  attempts: number;
  lastReviewedAt: string;
  /** Consecutive times this same status was selected; resets when the status changes. */
  statusStreak?: number;
  /** ISO timestamp for the next scheduled recall. Optional for legacy backups. */
  nextReviewAt?: string;
};

export type AppProgress = {
  records: ProgressRecord[];
  completedQuestions: number;
  weakQuestions: number;
  reviewQuestions: number;
};

export type ProgressSummary = {
  totalQuestions: number;
  completedQuestions: number;
  knownQuestions: number;
  reviewQuestions: number;
  weakQuestions: number;
  percentComplete: number;
};
