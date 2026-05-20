export type QuestionStatus = "new" | "known" | "review" | "weak";

export type ProgressRecord = {
  questionId: string;
  status: QuestionStatus;
  attempts: number;
  lastReviewedAt: string;
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
