"use client";

import { useMemo, useSyncExternalStore } from "react";
import { allQuestions, getQuestionsByTopic } from "@/lib/questionUtils";
import { PROGRESS_STORAGE_KEY, emptyProgress, readProgress, subscribeToProgress, writeProgress } from "@/lib/storage";
import type { AppProgress, ProgressRecord, ProgressSummary, QuestionStatus } from "@/types/Progress";

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

export function markQuestionStatus(
  progress: AppProgress,
  questionId: string,
  status: QuestionStatus
): AppProgress {
  const existing = getRecord(progress, questionId);
  const updatedRecord: ProgressRecord = {
    questionId,
    status,
    attempts: (existing?.attempts ?? 0) + 1,
    lastReviewedAt: new Date().toISOString()
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
