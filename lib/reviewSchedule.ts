import type { ProgressRecord, QuestionStatus } from "@/types/Progress";

const DAY_MS = 24 * 60 * 60 * 1000;

function reviewIntervalDays(status: QuestionStatus, statusStreak: number): number | null {
  if (status === "new") return null;
  const repetition = Math.max(0, statusStreak - 1);
  if (status === "weak") return [1, 1, 2, 3, 5, 8][Math.min(repetition, 5)] + Math.max(0, repetition - 5) * 5;
  if (status === "review") return [1, 3, 7, 14, 30, 60][Math.min(repetition, 5)] + Math.max(0, repetition - 5) * 30;
  return [3, 7, 14, 30, 60, 120][Math.min(repetition, 5)] + Math.max(0, repetition - 5) * 60;
}

export function getNextReviewAt(status: QuestionStatus, statusStreak: number, reviewedAt = new Date()): string | undefined {
  const intervalDays = reviewIntervalDays(status, statusStreak);
  return intervalDays === null ? undefined : new Date(reviewedAt.getTime() + intervalDays * DAY_MS).toISOString();
}

/** Supports pre-scheduling local records by deriving their first due date on read. */
export function resolveNextReviewAt(record: ProgressRecord): string | undefined {
  if (record.nextReviewAt) return record.nextReviewAt;
  const reviewedAt = new Date(record.lastReviewedAt);
  return Number.isNaN(reviewedAt.getTime())
    ? undefined
    : getNextReviewAt(record.status, record.statusStreak ?? 1, reviewedAt);
}

export function isDueForReview(record: ProgressRecord, now = new Date()): boolean {
  const nextReviewAt = resolveNextReviewAt(record);
  return Boolean(nextReviewAt && new Date(nextReviewAt).getTime() <= now.getTime());
}

export function getDueReviewRecords(records: ProgressRecord[], now = new Date()): ProgressRecord[] {
  return records
    .filter((record) => record.status !== "new" && isDueForReview(record, now))
    .sort((a, b) => {
      const urgency = { weak: 0, review: 1, known: 2, new: 3 } as const;
      const statusDifference = urgency[a.status] - urgency[b.status];
      if (statusDifference !== 0) return statusDifference;
      return (resolveNextReviewAt(a) ?? "").localeCompare(resolveNextReviewAt(b) ?? "");
    });
}
