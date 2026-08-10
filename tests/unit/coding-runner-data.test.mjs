import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the Python pilot exposes only explicit visible test metadata", async () => {
  const questions = JSON.parse(await readFile(new URL("../../data/questions/python-coding.json", import.meta.url), "utf8"));
  const pilot = questions.find((question) => question.id === "python-coding-001");

  assert.deepEqual(pilot.runner, {
    language: "python",
    entrypoint: "find_duplicates",
    visibleTests: [
      { name: "keeps the first duplicate order", args: [[1, 2, 3, 2, 4, 1]], expected: [2, 1] },
      { name: "returns an empty list when all values are unique", args: [[1, 2, 3]], expected: [] },
    ],
  });
  assert.equal("hiddenTests" in pilot.runner, false);
});
