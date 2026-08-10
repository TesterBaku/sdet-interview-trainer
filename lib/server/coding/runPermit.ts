import "server-only";

import { createHash } from "node:crypto";

type Permit = { allowed: true; release: () => void } | { allowed: false };

type Bucket = { startedAt: number; runs: number; active: number };

const WINDOW_MS = 60 * 60 * 1000;
const MAX_BUCKETS = 512;
const state = new Map<string, Bucket>();

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of state) {
    if (now - bucket.startedAt >= WINDOW_MS) state.delete(key);
  }
}

function makeRoomForBucket() {
  while (state.size >= MAX_BUCKETS) {
    const oldestKey = state.keys().next().value as string | undefined;
    if (!oldestKey) return;
    state.delete(oldestKey);
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function configuredLimits() {
  return {
    maxRuns: positiveInteger(process.env.CODING_RUNNER_MAX_RUNS_PER_HOUR, 5),
    maxConcurrent: positiveInteger(process.env.CODING_RUNNER_MAX_CONCURRENT, 1),
  };
}

export function isCodeRunnerEnabled() {
  return process.env.CODING_RUNNER_ENABLED === "true";
}

export function anonymizeClientKey(clientAddress: string) {
  return createHash("sha256").update(clientAddress).digest("base64url");
}

/**
 * A deliberately small, process-local circuit breaker. Production remains off until a durable
 * cross-instance limiter is selected; this guard still prevents a single warm instance from
 * allocating unbounded Sandboxes when the feature is being verified.
 */
export function acquireRunPermit(clientKey: string, now = Date.now()): Permit {
  if (!isCodeRunnerEnabled()) return { allowed: false };

  const { maxRuns, maxConcurrent } = configuredLimits();
  pruneExpiredBuckets(now);
  const current = state.get(clientKey);
  if (!current) makeRoomForBucket();
  const bucket = current ?? { startedAt: now, runs: 0, active: 0 };

  if (bucket.runs >= maxRuns || bucket.active >= maxConcurrent) return { allowed: false };
  bucket.runs += 1;
  bucket.active += 1;
  state.set(clientKey, bucket);

  let released = false;
  return {
    allowed: true,
    release() {
      if (released) return;
      released = true;
      bucket.active = Math.max(0, bucket.active - 1);
    },
  };
}
