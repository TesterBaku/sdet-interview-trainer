import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (relative) => readFile(new URL(`../../${relative}`, import.meta.url), "utf8");

test("the private runner is server-only, fail-closed, and does not expose raw sandbox output", async () => {
  const [route, suites, runner, permit] = await Promise.all([
    source("app/api/runs/route.ts"),
    source("lib/server/coding/hiddenSuites.ts"),
    source("lib/server/coding/runPython.ts"),
    source("lib/server/coding/runPermit.ts"),
  ]);

  assert.match(route, /isAllowedOrigin/);
  assert.match(route, /acquireRunPermit/);
  assert.match(suites, /^import "server-only";/);
  assert.match(runner, /^import "server-only";/);
  assert.match(runner, /networkPolicy: "deny-all"/);
  assert.match(runner, /sandbox\.stop\(\)/);
  assert.match(permit, /CODING_RUNNER_ENABLED === "true"/);
  assert.match(permit, /createHash\("sha256"\)/);
  assert.doesNotMatch(route, /stdout|stderr/);
});
