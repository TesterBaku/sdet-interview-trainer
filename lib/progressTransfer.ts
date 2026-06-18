import type { AppProgress, ProgressRecord, QuestionStatus } from "@/types/Progress";

// Bumped if the exported envelope shape ever changes incompatibly.
export const PROGRESS_EXPORT_VERSION = 1;
const APP_TAG = "sdet-interview-trainer";

type ProgressExport = {
  app: string;
  version: number;
  exportedAt: string;
  progress: AppProgress;
};

const VALID_STATUSES: readonly QuestionStatus[] = ["new", "known", "review", "weak"];

function recomputeCounts(records: ProgressRecord[]): AppProgress {
  return {
    records,
    completedQuestions: records.filter((r) => r.status !== "new").length,
    weakQuestions: records.filter((r) => r.status === "weak").length,
    reviewQuestions: records.filter((r) => r.status === "review").length
  };
}

/** Serialize progress into a versioned, pretty-printed backup payload. */
export function serializeProgress(progress: AppProgress, exportedAt: string): string {
  const payload: ProgressExport = {
    app: APP_TAG,
    version: PROGRESS_EXPORT_VERSION,
    exportedAt,
    progress
  };
  return JSON.stringify(payload, null, 2);
}

function isValidRecord(value: unknown): value is ProgressRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.questionId === "string" &&
    typeof record.status === "string" &&
    VALID_STATUSES.includes(record.status as QuestionStatus) &&
    typeof record.attempts === "number" &&
    typeof record.lastReviewedAt === "string"
  );
}

export type ParseResult =
  | { ok: true; progress: AppProgress }
  | { ok: false; error: string };

/**
 * Parse and validate an imported backup. Accepts both the versioned envelope
 * produced by {@link serializeProgress} and a bare AppProgress object (so a
 * hand-edited or legacy file still imports). Counts are always recomputed from
 * the records, so a tampered total can't desync the summaries.
 */
export function parseProgressImport(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "That file doesn't look like a progress backup." };
  }

  // Unwrap the envelope if present, otherwise treat the object as bare progress.
  const container = parsed as Record<string, unknown>;
  const source =
    "progress" in container && typeof container.progress === "object" && container.progress !== null
      ? (container.progress as Record<string, unknown>)
      : container;

  const rawRecords = source.records;
  if (!Array.isArray(rawRecords)) {
    return { ok: false, error: "That file doesn't look like a progress backup." };
  }

  const records = rawRecords.filter(isValidRecord);
  if (records.length !== rawRecords.length) {
    return { ok: false, error: "The backup contains malformed records." };
  }

  return { ok: true, progress: recomputeCounts(records) };
}
