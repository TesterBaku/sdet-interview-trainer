import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runner-enabled Python questions expose reviewed visible-only contracts", async () => {
  const questions = JSON.parse(await readFile(new URL("../../data/questions/python-coding.json", import.meta.url), "utf8"));
  const runners = Object.fromEntries(questions.filter((question) => question.runner).map((question) => [question.id, question.runner]));

  assert.deepEqual(runners, {
    "python-coding-001": {
      language: "python",
      entrypoint: "find_duplicates",
      visibleTests: [
        { name: "keeps the first duplicate order", args: [[1, 2, 3, 2, 4, 1]], expected: [2, 1] },
        { name: "returns an empty list when all values are unique", args: [[1, 2, 3]], expected: [] },
      ],
    },
    "python-coding-004": {
      language: "python",
      entrypoint: "compare_strings",
      visibleTests: [
        { name: "ignores case and outer whitespace", args: ["  Hello World ", "hello world"], expected: true },
        { name: "returns false for different text", args: ["hello", "hello!"], expected: false },
      ],
    },
    "python-coding-005": {
      language: "python",
      entrypoint: "extract_field",
      visibleTests: [
        {
          name: "skips missing keys and preserves item order",
          args: [[{ id: 1, name: "Alice" }, { id: 2 }, { id: 3, name: "Bob" }], "name"],
          expected: ["Alice", "Bob"],
        },
        { name: "returns an empty list when no item has the field", args: [[{ id: 1 }, { id: 2 }], "name"], expected: [] },
      ],
    },
    "python-coding-006": {
      language: "python",
      entrypoint: "validate_json",
      visibleTests: [
        {
          name: "returns parsed data and missing keys in request order",
          args: ['{"id": 1, "status": "ok"}', ["id", "status", "name"]],
          expected: [{ id: 1, status: "ok" }, ["name"]],
        },
        {
          name: "returns the invalid JSON sentinel instead of raising",
          args: ['{"id":', ["id"]],
          expected: [null, ["INVALID_JSON"]],
        },
      ],
    },
    "python-coding-007": {
      language: "python",
      entrypoint: "parse_csv",
      visibleTests: [
        {
          name: "maps header names to each data row",
          args: ["username,password\nalice,secret1\nbob,secret2\n"],
          expected: [{ username: "alice", password: "secret1" }, { username: "bob", password: "secret2" }],
        },
        { name: "returns an empty list for header-only CSV text", args: ["id,status\n"], expected: [] },
      ],
    },
    "python-coding-008": {
      language: "python",
      entrypoint: "diff_dicts",
      visibleTests: [
        {
          name: "reports mismatches and missing expected keys in sorted path order",
          args: [{ a: 1, b: { x: 10 } }, { a: 2, b: { x: 10, y: 20 }, c: 3 }],
          expected: ["a: expected 1, got 2", "b.y: key missing in expected", "c: key missing in expected"],
        },
        {
          name: "reports a nested key missing from actual",
          args: [{ user: { id: 1, name: "Ada" } }, { user: { id: 1 } }],
          expected: ["user.name: key missing in actual"],
        },
      ],
    },
    "python-coding-009": {
      language: "python",
      entrypoint: "group_by",
      visibleTests: [
        {
          name: "groups string values while preserving item order",
          args: [
            [{ env: "prod", test: "login" }, { env: "staging", test: "checkout" }, { env: "prod", test: "logout" }],
            "env",
          ],
          expected: {
            prod: [{ env: "prod", test: "login" }, { env: "prod", test: "logout" }],
            staging: [{ env: "staging", test: "checkout" }],
          },
        },
        { name: "returns an empty object for an empty item list", args: [[], "env"], expected: {} },
      ],
    },
    "python-coding-010": {
      language: "python",
      entrypoint: "flatten",
      visibleTests: [
        { name: "flattens one level of nested lists", args: [[[1, 2], [3, 4], [5]]], expected: [1, 2, 3, 4, 5] },
        { name: "preserves scalars and skips empty inner lists", args: [[1, [2, 3], 4, []]], expected: [1, 2, 3, 4] },
      ],
    },
  });
  for (const runner of Object.values(runners)) assert.equal("hiddenTests" in runner, false);
});
