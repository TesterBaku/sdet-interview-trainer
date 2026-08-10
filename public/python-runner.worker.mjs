import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.mjs";

let pyodidePromise;

function getPyodide() {
  pyodidePromise ??= loadPyodide();
  return pyodidePromise;
}

const RUN_VISIBLE_TESTS = `
import json

def _safe_value(value):
    try:
        json.dumps(value)
        return value
    except (TypeError, ValueError):
        return repr(value)[:500]

def _error(error):
    return f"{type(error).__name__}: {error}"[:500]

def _run_visible_tests(source, entrypoint, tests_json):
    namespace = {"__name__": "__submission__"}
    try:
        exec(compile(source, "<submission>", "exec"), namespace)
    except BaseException as error:
        return json.dumps({"status": "error", "error": _error(error), "tests": []})

    candidate = namespace.get(entrypoint)
    if not callable(candidate):
        return json.dumps({
            "status": "error",
            "error": f"Define a callable named {entrypoint}.",
            "tests": [],
        })

    results = []
    for test in json.loads(tests_json):
        try:
            actual = candidate(*test["args"])
            results.append({
                "name": test["name"],
                "passed": actual == test["expected"],
                "actual": _safe_value(actual),
            })
        except BaseException as error:
            results.append({
                "name": test["name"],
                "passed": False,
                "error": _error(error),
            })

    return json.dumps({"status": "completed", "tests": results})
`;

self.onmessage = async ({ data }) => {
  if (data?.type !== "run") {
    return;
  }

  try {
    const pyodide = await getPyodide();
    pyodide.globals.set("runner_source", data.source);
    pyodide.globals.set("runner_entrypoint", data.entrypoint);
    pyodide.globals.set("runner_tests_json", JSON.stringify(data.tests));
    const result = await pyodide.runPythonAsync(
      `${RUN_VISIBLE_TESTS}\n_run_visible_tests(runner_source, runner_entrypoint, runner_tests_json)`
    );

    self.postMessage({ type: "result", result: JSON.parse(result) });
  } catch (error) {
    self.postMessage({
      type: "result",
      result: {
        status: "error",
        error: error instanceof Error ? error.message.slice(0, 500) : "The Python runner could not start.",
        tests: [],
      },
    });
  }
};
