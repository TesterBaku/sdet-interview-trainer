import { getAdaptiveDailyPlan, getDailyPlan, getQuestion, type DailyPlanSection } from "@/lib/questionUtils";
import type { ProgressRecord } from "@/types/Progress";

const STORAGE_PREFIX = "sdet-interview-trainer-daily-plan:";
const clientSnapshots = new Map<string, DailyPlanSnapshot>();
const serverSnapshots = new Map<string, DailyPlanSnapshot>();

type StoredDailyPlan = {
  sections: Record<string, string[]>;
  dueQuestionIds: string[];
};

export type DailyPlanSnapshot = {
  plan: DailyPlanSection[];
  dueQuestionIds: string[];
};

function toSnapshot(date: Date, stored: StoredDailyPlan): DailyPlanSnapshot {
  const baseline = getDailyPlan(date);
  return {
    plan: baseline.map((section) => ({
      ...section,
      questions: (stored.sections[section.id] ?? [])
        .map(getQuestion)
        .filter((question): question is NonNullable<typeof question> => Boolean(question)),
    })),
    dueQuestionIds: stored.dueQuestionIds,
  };
}

function isStoredDailyPlan(value: unknown): value is StoredDailyPlan {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const sections = candidate.sections;
  return (
    typeof sections === "object" &&
    sections !== null &&
    Object.values(sections).every(
      (questionIds) => Array.isArray(questionIds) && questionIds.every((questionId) => typeof questionId === "string"),
    ) &&
    Array.isArray(candidate.dueQuestionIds) &&
    candidate.dueQuestionIds.every((id) => typeof id === "string")
  );
}

/** Reads the immutable selection for this UTC day, creating it from current progress only once. */
export function readOrCreateDailyPlanSnapshot(dateIso: string, records: ProgressRecord[]): DailyPlanSnapshot {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  const key = `${STORAGE_PREFIX}${dateIso}`;
  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredDailyPlan(parsed)) return toSnapshot(date, parsed);
    } catch {
      // Replace malformed snapshots with a fresh one below.
    }
  }

  const { plan, dueQuestionIds } = getAdaptiveDailyPlan(date, records);
  const stored: StoredDailyPlan = {
    sections: Object.fromEntries(plan.map((section) => [section.id, section.questions.map((question) => question.id)])),
    dueQuestionIds,
  };
  window.localStorage.setItem(key, JSON.stringify(stored));
  return { plan, dueQuestionIds };
}

/** Stable client snapshot for useSyncExternalStore; immutable until the next UTC day. */
export function getClientDailyPlanSnapshot(dateIso: string, records: ProgressRecord[]): DailyPlanSnapshot {
  const cached = clientSnapshots.get(dateIso);
  if (cached) return cached;
  const snapshot = readOrCreateDailyPlanSnapshot(dateIso, records);
  clientSnapshots.set(dateIso, snapshot);
  return snapshot;
}

/** Calendar-only server snapshot prevents localStorage from affecting hydration. */
export function getServerDailyPlanSnapshot(dateIso: string): DailyPlanSnapshot {
  const cached = serverSnapshots.get(dateIso);
  if (cached) return cached;
  const snapshot = { plan: getDailyPlan(new Date(`${dateIso}T00:00:00.000Z`)), dueQuestionIds: [] };
  serverSnapshots.set(dateIso, snapshot);
  return snapshot;
}

export function subscribeToDailyPlanSnapshot(): () => void {
  return () => {};
}
