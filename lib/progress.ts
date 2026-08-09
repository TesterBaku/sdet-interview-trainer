"use client";

import { useMemo, useSyncExternalStore } from "react";
import { allQuestions, getQuestionsByTopic } from "@/lib/questionUtils";
import { PROGRESS_STORAGE_KEY, emptyProgress, readProgress, subscribeToProgress, writeProgress } from "@/lib/storage";
import type { AppProgress, ProgressRecord, ProgressSummary, QuestionStatus } from "@/types/Progress";
import { getNextReviewAt, normalizeStatusStreak } from "@/lib/reviewSchedule";

export { getDueReviewRecords, getNextReviewAt, isDueForReview, resolveNextReviewAt } from "@/lib/reviewSchedule";

function normalizeProgress(records: ProgressRecord[]): AppProgress {
  const completedRecords = records.filter((record) => record.status !== "new");

  return {
    records,
    completedQuestions: completedRecords.length,
    weakQuestions: records.filter((record) => record.status === "weak").length,
    reviewQuestions: records.filter((record) => record.status === "review").length
  };
}

export function getRecord(progress: AppProgress, questionId: string): ProgressRecord | undefined {
  return progress.records.find((record) => record.questionId === questionId);
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/**
 * A repetition counts at most once per UTC day. Re-clicking the same status in
 * one sitting — a double-click, or marking again before advancing — is not a
 * spaced repetition, and letting it grow the streak would push the question
 * days out of the review queue after a single session.
 */
function nextStatusStreak(existing: ProgressRecord | undefined, status: QuestionStatus, reviewedAt: Date): number {
  if (!existing || existing.status !== status) return 1;
  const current = normalizeStatusStreak(existing.statusStreak);
  const previousReview = new Date(existing.lastReviewedAt);
  // An unparseable previous timestamp is treated as "same day" so a corrupt
  // record cannot inflate the interval.
  if (Number.isNaN(previousReview.getTime())) return current;
  return isSameUtcDay(previousReview, reviewedAt) ? current : current + 1;
}

export function markQuestionStatus(
  progress: AppProgress,
  questionId: string,
  status: QuestionStatus
): AppProgress {
  const existing = getRecord(progress, questionId);
  const attempts = (existing?.attempts ?? 0) + 1;
  const reviewedAt = new Date();
  const statusStreak = nextStatusStreak(existing, status, reviewedAt);
  const updatedRecord: ProgressRecord = {
    questionId,
    status,
    attempts,
    lastReviewedAt: reviewedAt.toISOString(),
    statusStreak,
    nextReviewAt: getNextReviewAt(status, statusStreak, reviewedAt)
  };

  const records = existing
    ? progress.records.map((record) => (record.questionId === questionId ? updatedRecord : record))
    : [...progress.records, updatedRecord];

  return normalizeProgress(records);
}

export function summarizeProgress(progress: AppProgress, questionIds = allQuestions.map((q) => q.id)): ProgressSummary {
  const relevantRecords = progress.records.filter((record) => questionIds.includes(record.questionId));
  const completedQuestions = relevantRecords.filter((record) => record.status !== "new").length;
  const totalQuestions = questionIds.length;

  return {
    totalQuestions,
    completedQuestions,
    knownQuestions: relevantRecords.filter((record) => record.status === "known").length,
    reviewQuestions: relevantRecords.filter((record) => record.status === "review").length,
    weakQuestions: relevantRecords.filter((record) => record.status === "weak").length,
    percentComplete: totalQuestions === 0 ? 0 : Math.round((completedQuestions / totalQuestions) * 100)
  };
}

export function summarizeTopicProgress(progress: AppProgress, topicId: string): ProgressSummary {
  return summarizeProgress(
    progress,
    getQuestionsByTopic(topicId).map((question) => question.id)
  );
}

export function useProgress() {
  const snapshot = useSyncExternalStore(
    subscribeToProgress,
    () => window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? JSON.stringify(emptyProgress),
    () => JSON.stringify(emptyProgress)
  );

  const progress = useMemo(() => {
    try {
      const parsed = JSON.parse(snapshot) as AppProgress;
      return normalizeProgress(Array.isArray(parsed.records) ? parsed.records : []);
    } catch {
      return emptyProgress;
    }
  }, [snapshot]);

  function updateQuestion(questionId: string, status: QuestionStatus) {
    writeProgress(markQuestionStatus(readProgress(), questionId, status));
  }

  return { progress, isLoaded: true, updateQuestion };
}
