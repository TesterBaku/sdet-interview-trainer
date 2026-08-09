import type { ProgressRecord, QuestionStatus } from "@/types/Progress";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Indexed by repetition; past the last rung the interval grows by a fixed step. */
const INTERVAL_LADDERS = {
  weak: { rungs: [1, 1, 2, 3, 5, 8], step: 5 },
  review: { rungs: [1, 3, 7, 14, 30, 60], step: 30 },
  known: { rungs: [3, 7, 14, 30, 60, 120], step: 60 },
} as const;

const STATUS_URGENCY = { weak: 0, review: 1, known: 2, new: 3 } as const;

/**
 * Persisted streaks can be missing (legacy backups) or corrupt (hand-edited or
 * partially written localStorage). Either would otherwise reach the ladder as
 * NaN and produce an unschedulable "Invalid time value" date.
 */
export function normalizeStatusStreak(statusStreak: unknown): number {
  return typeof statusStreak === "number" && Number.isFinite(statusStreak)
    ? Math.max(1, Math.floor(statusStreak))
    : 1;
}

function reviewIntervalDays(status: QuestionStatus, statusStreak: number): number | null {
  if (status === "new") return null;
  const repetition = normalizeStatusStreak(statusStreak) - 1;
  const { rungs, step } = INTERVAL_LADDERS[status];
  const lastRung = rungs.length - 1;
  return rungs[Math.min(repetition, lastRung)] + Math.max(0, repetition - lastRung) * step;
}

export function getNextReviewAt(status: QuestionStatus, statusStreak: number, reviewedAt = new Date()): string | undefined {
  const intervalDays = reviewIntervalDays(status, statusStreak);
  if (intervalDays === null) return undefined;
  // Guards a corrupt reviewedAt as well as a corrupt streak — an invalid Date
  // here would throw out of the click handler that marks the question.
  const dueAt = reviewedAt.getTime() + intervalDays * DAY_MS;
  return Number.isFinite(dueAt) ? new Date(dueAt).toISOString() : undefined;
}

/**
 * Supports pre-scheduling local records by deriving their first due date on
 * read. A stored nextReviewAt is only trusted when it parses: an unparseable
 * one compares as NaN against every cutoff, which would strand the question
 * outside the review queue permanently rather than merely mis-scheduling it.
 */
export function resolveNextReviewAt(record: ProgressRecord): string | undefined {
  if (typeof record.nextReviewAt === "string" && !Number.isNaN(new Date(record.nextReviewAt).getTime())) {
    return record.nextReviewAt;
  }
  const reviewedAt = new Date(record.lastReviewedAt);
  return Number.isNaN(reviewedAt.getTime())
    ? undefined
    : getNextReviewAt(record.status, normalizeStatusStreak(record.statusStreak), reviewedAt);
}

export function isDueForReview(record: ProgressRecord, now = new Date()): boolean {
  const nextReviewAt = resolveNextReviewAt(record);
  return Boolean(nextReviewAt && new Date(nextReviewAt).getTime() <= now.getTime());
}

export function getDueReviewRecords(records: ProgressRecord[], now = new Date()): ProgressRecord[] {
  const nowTime = now.getTime();
  // Resolve each record's due date once up front: it was previously recomputed
  // inside the comparator, so every pairwise comparison re-parsed the date.
  return records
    .filter((record) => record.status !== "new")
    .map((record) => {
      const dueAt = resolveNextReviewAt(record);
      return { record, dueAt: dueAt ?? "", dueTime: dueAt ? new Date(dueAt).getTime() : Number.NaN };
    })
    .filter((entry) => entry.dueTime <= nowTime)
    .sort((a, b) => {
      const statusDifference = STATUS_URGENCY[a.record.status] - STATUS_URGENCY[b.record.status];
      return statusDifference !== 0 ? statusDifference : a.dueAt.localeCompare(b.dueAt);
    })
    .map((entry) => entry.record);
}
