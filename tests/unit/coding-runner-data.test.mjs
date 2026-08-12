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
  });
  for (const runner of Object.values(runners)) assert.equal("hiddenTests" in runner, false);
});
