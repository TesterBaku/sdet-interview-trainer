"use client";

const CODE_WORKSPACE_STORAGE_PREFIX = "sdet-interview-trainer-code-answer:";
const CODE_WORKSPACE_CHANGE_EVENT = "sdet-interview-trainer-code-answer-change";

export function readCodeDraft(questionId: string): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(`${CODE_WORKSPACE_STORAGE_PREFIX}${questionId}`) ?? "";
}

export function writeCodeDraft(questionId: string, draft: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(`${CODE_WORKSPACE_STORAGE_PREFIX}${questionId}`, draft);
  window.dispatchEvent(new Event(`${CODE_WORKSPACE_CHANGE_EVENT}:${questionId}`));
}

export function clearCodeDraft(questionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(`${CODE_WORKSPACE_STORAGE_PREFIX}${questionId}`);
  window.dispatchEvent(new Event(`${CODE_WORKSPACE_CHANGE_EVENT}:${questionId}`));
}

export function subscribeToCodeDraft(questionId: string, onStoreChange: () => void): () => void {
  const eventName = `${CODE_WORKSPACE_CHANGE_EVENT}:${questionId}`;
  window.addEventListener(eventName, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(eventName, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
