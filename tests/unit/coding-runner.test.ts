import assert from "node:assert/strict";
import test from "node:test";
import { createRunHandler } from "@/app/api/runs/route";
import type { JsonValue } from "@/lib/coding/contracts";
import { getHiddenSuite } from "@/lib/server/coding/hiddenSuites";
import { parseResult, runPythonSuite, sameJson, type PythonSandboxFactory } from "@/lib/server/coding/runPython";
import type { Question } from "@/types/Question";

const marker = "__CODING_RUN_RESULT__";
const question: Question = {
  id: "python-coding-001",
  topicId: "python",
  topicTitle: "Python",
  level: "mid",
  type: "coding",
  difficulty: "easy",
  question: "Find duplicates.",
  tags: [],
  runner: {
    language: "python",
    entrypoint: "find_duplicates",
    visibleTests: [{ name: "public case", args: [[1, 1]], expected: [1] }],
  },
};

function sandboxFactory(results: Array<string | Error>) {
  let stopped = 0;
  const factory: PythonSandboxFactory = async () => ({
    writeFiles: async () => undefined,
    runCommand: async () => {
      const next = results.shift();
      if (next instanceof Error) throw next;
      return { stdout: async () => next ?? "" };
    },
    stop: async () => { stopped += 1; },
  });
  return { factory, getStopped: () => stopped };
}

function validRequest(overrides: Record<string, unknown> = {}) {
  return new Request("https://example.test/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://example.test", "x-forwarded-for": "203.0.113.7" },
    body: JSON.stringify({ questionId: question.id, language: "python", source: "def find_duplicates(xs): return [1]", turnstileToken: "token", ...overrides }),
  });
}

test("trusted sandbox protocol parses only its final marker and compares JSON structurally", () => {
  assert.deepEqual(parseResult(`noise\n${marker}{"ok":true,"value":{"b":2,"a":1}}`), { ok: true, value: { b: 2, a: 1 } });
  assert.deepEqual(parseResult(`${marker}{"ok":false,"kind":"syntax_error"}`), { ok: false, kind: "syntax_error" });
  assert.deepEqual(parseResult("candidate output without a marker"), { ok: false, kind: "runtime_error" });
  assert.equal(sameJson({ a: 1, b: [true] }, { b: [true], a: 1 }), true);
  assert.equal(sameJson([1] as JsonValue, [2] as JsonValue), false);
});

test("Python suite redacts hidden failures and always stops its sandbox", async () => {
  const fake = sandboxFactory([
    `${marker}{"ok":true,"value":[1]}`,
    `${marker}{"ok":true,"value":"wrong"}`,
  ]);
  const result = await runPythonSuite("candidate", "find_duplicates", question.runner!.visibleTests, [{ args: [["hidden-sentinel"]], expected: "private-expected" }], fake.factory);

  assert.deepEqual(result, {
    status: "failed",
    visible: { passed: 1, total: 1, tests: [{ name: "public case", passed: true }] },
    hidden: { passed: 0, total: 1 },
  });
  assert.doesNotMatch(JSON.stringify(result), /hidden-sentinel|private-expected/);
  assert.equal(fake.getStopped(), 1);
});

test("Python suite reports a command timeout and still cleans up", async () => {
  const fake = sandboxFactory([new Error("command timed out"), new Error("command timed out")]);
  const result = await runPythonSuite("candidate", "find_duplicates", question.runner!.visibleTests, [{ args: [[]], expected: [] }], fake.factory);

  assert.equal(result.status, "timeout");
  assert.equal(result.visible.tests[0]?.passed, false);
  assert.equal(result.hidden.passed, 0);
  assert.equal(fake.getStopped(), 1);
});

test("Python suite classifies syntax and runtime failures without returning harness details", async () => {
  const syntax = sandboxFactory([`${marker}{"ok":false,"kind":"syntax_error"}`, `${marker}{"ok":false,"kind":"syntax_error"}`]);
  const syntaxResult = await runPythonSuite("candidate", "find_duplicates", question.runner!.visibleTests, [{ args: [[]], expected: [] }], syntax.factory);
  assert.equal(syntaxResult.status, "syntax_error");
  assert.equal(syntaxResult.visible.tests[0]?.error, "Could not run this case.");
  assert.equal(syntax.getStopped(), 1);

  const runtime = sandboxFactory([`${marker}{"ok":false,"kind":"runtime_error"}`, `${marker}{"ok":false,"kind":"runtime_error"}`]);
  const runtimeResult = await runPythonSuite("candidate", "find_duplicates", question.runner!.visibleTests, [{ args: [[]], expected: [] }], runtime.factory);
  assert.equal(runtimeResult.status, "runtime_error");
  assert.equal(runtime.getStopped(), 1);
});

test("hidden-suite parsing fails closed for malformed and non-finite private configuration", () => {
  const previous = process.env.CODING_HIDDEN_TEST_SUITES_JSON;
  try {
    process.env.CODING_HIDDEN_TEST_SUITES_JSON = JSON.stringify({ version: 1, suites: { [question.id]: { language: "python", entrypoint: "find_duplicates", tests: [{ args: [["hidden-sentinel"]], expected: "private-expected" }] } } });
    assert.deepEqual(getHiddenSuite(question.id, "python", "find_duplicates")?.tests, [{ args: [["hidden-sentinel"]], expected: "private-expected" }]);

    process.env.CODING_HIDDEN_TEST_SUITES_JSON = "{not-json";
    assert.equal(getHiddenSuite(question.id, "python", "find_duplicates"), null);

    process.env.CODING_HIDDEN_TEST_SUITES_JSON = `{"version":1,"suites":{"${question.id}":{"language":"python","entrypoint":"find_duplicates","tests":[{"args":[],"expected":1e999}]}}}`;
    assert.equal(getHiddenSuite(question.id, "python", "find_duplicates"), null);
  } finally {
    if (previous === undefined) delete process.env.CODING_HIDDEN_TEST_SUITES_JSON;
    else process.env.CODING_HIDDEN_TEST_SUITES_JSON = previous;
  }
});

test("run route rejects malformed requests before verification and releases a successful permit", async () => {
  const originalHosts = process.env.TURNSTILE_HOSTNAMES;
  process.env.TURNSTILE_HOSTNAMES = "example.test";
  let verifyCalls = 0;
  let releases = 0;
  const success = {
    status: "passed",
    visible: { passed: 1, total: 1, tests: [{ name: "public case", passed: true }] },
    hidden: { passed: 1, total: 1 },
  } satisfies Awaited<ReturnType<typeof runPythonSuite>>;
  const handler = createRunHandler({
    getQuestion: () => question,
    verifyTurnstile: async () => { verifyCalls += 1; return true; },
    getHiddenSuite: () => ({ language: "python", entrypoint: "find_duplicates", tests: [{ args: [["hidden-sentinel"]], expected: "private-expected" }] }),
    acquireRunPermit: () => ({ allowed: true, release: () => { releases += 1; } }),
    anonymizeClientKey: () => "client",
    isCodeRunnerEnabled: () => true,
    runPythonSuite: async () => success,
  });
  try {
    const malformed = await handler(validRequest({ source: "" }));
    assert.equal(malformed.status, 400);
    assert.equal(verifyCalls, 0);

    const response = await handler(validRequest());
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(payload, success);
    assert.doesNotMatch(JSON.stringify(payload), /hidden-sentinel|private-expected/);
    assert.equal(releases, 1);
  } finally {
    if (originalHosts === undefined) delete process.env.TURNSTILE_HOSTNAMES;
    else process.env.TURNSTILE_HOSTNAMES = originalHosts;
  }
});

test("run route rejects an unverified Turnstile token before allocating a permit", async () => {
  const originalHosts = process.env.TURNSTILE_HOSTNAMES;
  process.env.TURNSTILE_HOSTNAMES = "example.test";
  let permitCalls = 0;
  const handler = createRunHandler({
    getQuestion: () => question,
    verifyTurnstile: async () => false,
    getHiddenSuite: () => null,
    acquireRunPermit: () => { permitCalls += 1; return { allowed: false } as const; },
    anonymizeClientKey: () => "client",
    isCodeRunnerEnabled: () => true,
    runPythonSuite: async () => { throw new Error("must not run"); },
  });
  try {
    const response = await handler(validRequest());
    assert.equal(response.status, 403);
    assert.equal(permitCalls, 0);
  } finally {
    if (originalHosts === undefined) delete process.env.TURNSTILE_HOSTNAMES;
    else process.env.TURNSTILE_HOSTNAMES = originalHosts;
  }
});
