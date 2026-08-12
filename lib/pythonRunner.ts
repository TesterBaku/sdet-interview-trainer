"use client";

import type { PythonRunner } from "@/types/Question";

export type VisibleTestResult = {
  name: string;
  passed: boolean;
  actual?: unknown;
  error?: string;
};

export type PythonRunResult = {
  status: "completed" | "error";
  tests: VisibleTestResult[];
  error?: string;
};

const BOOT_TIMEOUT_MS = 20_000;
const RUN_TIMEOUT_MS = 8_000;

export function runPythonVisibleTests(source: string, runner: PythonRunner): Promise<PythonRunResult> {
  return new Promise((resolve) => {
    const worker = new Worker("/python-runner.worker.mjs", { type: "module" });
    let completed = false;
    let timeout = window.setTimeout(() => {
      worker.terminate();
      completed = true;
      resolve({
        status: "error",
        error: "The Python runner took too long to start. Please try again.",
        tests: [],
      });
    }, BOOT_TIMEOUT_MS);

    function finish(result: PythonRunResult) {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      worker.terminate();
      resolve(result);
    }

    worker.onmessage = ({ data }) => {
      if (data?.type === "ready" && !completed) {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => finish({
          status: "error",
          error: "The run exceeded the 8-second browser limit. Check for an infinite loop and try again.",
          tests: [],
        }), RUN_TIMEOUT_MS);
      } else if (data?.type === "result") {
        finish(data.result as PythonRunResult);
      }
    };
    worker.onerror = () => {
      finish({ status: "error", error: "The Python runner stopped unexpectedly.", tests: [] });
    };
    worker.postMessage({
      type: "run",
      source,
      entrypoint: runner.entrypoint,
      tests: runner.visibleTests,
    });
  });
}
