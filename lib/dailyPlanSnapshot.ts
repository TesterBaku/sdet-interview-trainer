import {
  DAILY_PLAN_SECTION_IDS,
  getAdaptiveDailyPlan,
  getDailyPlan,
  getQuestion,
  type DailyPlanSection,
} from "@/lib/questionUtils";
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

/**
 * Returns null when the stored selection can no longer be honoured — a question
 * id that no longer resolves (removed or renamed by a same-day content deploy)
 * would otherwise silently shrink that lane for the rest of the UTC day. The
 * caller rebuilds and re-persists instead.
 */
function toSnapshot(date: Date, stored: StoredDailyPlan): DailyPlanSnapshot | null {
  const baseline = getDailyPlan(date);
  const plan: DailyPlanSection[] = [];
  for (const section of baseline) {
    const storedIds = stored.sections[section.id] ?? [];
    const questions = storedIds.map(getQuestion);
    if (questions.some((question) => !question)) return null;
    plan.push({ ...section, questions: questions as NonNullable<(typeof questions)[number]>[] });
  }
  return { plan, dueQuestionIds: stored.dueQuestionIds };
}

function isStoredDailyPlan(value: unknown): value is StoredDailyPlan {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const sections = candidate.sections;
  if (typeof sections !== "object" || sections === null) return false;
  const sectionMap = sections as Record<string, unknown>;
  return (
    // Every lane must be present: a snapshot missing one would otherwise pass
    // and render that lane permanently empty for the day.
    DAILY_PLAN_SECTION_IDS.every((sectionId) => {
      const questionIds = sectionMap[sectionId];
      return Array.isArray(questionIds) && questionIds.every((questionId) => typeof questionId === "string");
    }) &&
    Array.isArray(candidate.dueQuestionIds) &&
    candidate.dueQuestionIds.every((id) => typeof id === "string")
  );
}

/**
 * Set when a fresh plan had to be built. The write is deferred to
 * persistDailyPlanSnapshot so that getClientDailyPlanSnapshot — which React
 * calls as useSyncExternalStore's getSnapshot, possibly several times and for
 * renders it later discards — performs no storage side effect of its own.
 */
let pendingPersist: { key: string; stored: StoredDailyPlan } | null = null;

/** Reads the immutable selection for this UTC day. Pure: never writes storage. */
function readDailyPlanSnapshot(dateIso: string, records: ProgressRecord[]): DailyPlanSnapshot {
  const date = new Date(`${dateIso}T00:00:00.000Z`);
  const key = `${STORAGE_PREFIX}${dateIso}`;
  const raw = window.localStorage.getItem(key);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isStoredDailyPlan(parsed)) {
        const restored = toSnapshot(date, parsed);
        if (restored) return restored;
      }
    } catch {
      // Replace malformed snapshots with a fresh one below.
    }
  }

  const { plan, dueQuestionIds } = getAdaptiveDailyPlan(date, records);
  pendingPersist = {
    key,
    stored: {
      sections: Object.fromEntries(plan.map((section) => [section.id, section.questions.map((question) => question.id)])),
      dueQuestionIds,
    },
  };
  return { plan, dueQuestionIds };
}

/**
 * Commits a freshly built plan. Call from an effect: it runs only after a
 * render commits, so a discarded render cannot fix the whole day's selection.
 * Idempotent — a second call with nothing pending is a no-op.
 */
export function persistDailyPlanSnapshot(): void {
  if (!pendingPersist) return;
  const { key, stored } = pendingPersist;
  pendingPersist = null;
  window.localStorage.setItem(key, JSON.stringify(stored));
}

/** Stable client snapshot for useSyncExternalStore; immutable until the next UTC day. */
export function getClientDailyPlanSnapshot(dateIso: string, records: ProgressRecord[]): DailyPlanSnapshot {
  const cached = clientSnapshots.get(dateIso);
  if (cached) return cached;
  const snapshot = readDailyPlanSnapshot(dateIso, records);
  // Only the current day is ever read again; dropping older entries keeps a
  // long-lived tab or SSR process from retaining one full snapshot per day.
  clientSnapshots.clear();
  clientSnapshots.set(dateIso, snapshot);
  return snapshot;
}

/** Calendar-only server snapshot prevents localStorage from affecting hydration. */
export function getServerDailyPlanSnapshot(dateIso: string): DailyPlanSnapshot {
  const cached = serverSnapshots.get(dateIso);
  if (cached) return cached;
  const snapshot = { plan: getDailyPlan(new Date(`${dateIso}T00:00:00.000Z`)), dueQuestionIds: [] };
  serverSnapshots.clear();
  serverSnapshots.set(dateIso, snapshot);
  return snapshot;
}

export function subscribeToDailyPlanSnapshot(): () => void {
  return () => {};
}
