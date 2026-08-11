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
  });
  for (const runner of Object.values(runners)) assert.equal("hiddenTests" in runner, false);
});
