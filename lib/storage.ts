import type { AppProgress } from "@/types/Progress";

export const PROGRESS_STORAGE_KEY = "sdet-interview-trainer-progress";
export const PROGRESS_CHANGE_EVENT = "sdet-interview-trainer-progress-change";

export const emptyProgress: AppProgress = {
  records: [],
  completedQuestions: 0,
  weakQuestions: 0,
  reviewQuestions: 0
};

export function readProgress(): AppProgress {
  if (typeof window === "undefined") {
    return emptyProgress;
  }

  const rawProgress = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (!rawProgress) {
    return emptyProgress;
  }

  try {
    const parsed = JSON.parse(rawProgress) as AppProgress;
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      completedQuestions: parsed.completedQuestions ?? 0,
      weakQuestions: parsed.weakQuestions ?? 0,
      reviewQuestions: parsed.reviewQuestions ?? 0
    };
  } catch {
    return emptyProgress;
  }
}

export function writeProgress(progress: AppProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  window.dispatchEvent(new Event(PROGRESS_CHANGE_EVENT));
}
