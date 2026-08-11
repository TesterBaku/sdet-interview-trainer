import "server-only";

import { Sandbox } from "@vercel/sandbox";
import type { JsonValue, VisibleRunResult } from "@/lib/coding/contracts";
import type { HiddenCase } from "@/lib/server/coding/hiddenSuites";
import type { PythonVisibleTest } from "@/types/Question";

const MARKER = "__CODING_RUN_RESULT__";
const HARNESS = `import importlib.util, json, os, sys
def finish(payload):
    print("${MARKER}" + json.dumps(payload, separators=(",", ":"), allow_nan=False), flush=True)
    os._exit(0)
try:
    spec = importlib.util.spec_from_file_location("candidate", "/tmp/candidate.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = getattr(module, sys.argv[1])(*json.loads(sys.argv[2]))
    finish({"ok": True, "value": result})
except SyntaxError:
    finish({"ok": False, "kind": "syntax_error"})
except Exception:
    finish({"ok": False, "kind": "runtime_error"})`;

type InternalResult = { ok: true; value: JsonValue } | { ok: false; kind: "syntax_error" | "runtime_error" | "timeout" };

type PythonSandbox = {
  writeFiles(files: Array<{ path: string; content: string }>): Promise<unknown>;
  runCommand(command: string, args: string[], options: { timeoutMs: number }): Promise<{ stdout(): Promise<string> }>;
  stop(): Promise<unknown>;
};

export type PythonSandboxFactory = () => Promise<PythonSandbox>;

export function parseResult(output: string): InternalResult {
  const encoded = output.split("\n").filter((line) => line.startsWith(MARKER)).at(-1)?.slice(MARKER.length);
  if (!encoded) return { ok: false, kind: "runtime_error" };
  try {
    const parsed = JSON.parse(encoded) as { ok?: unknown; value?: JsonValue; kind?: unknown };
    if (parsed.ok === true) return { ok: true, value: parsed.value as JsonValue };
    return parsed.kind === "syntax_error" ? { ok: false, kind: "syntax_error" } : { ok: false, kind: "runtime_error" };
  } catch {
    return { ok: false, kind: "runtime_error" };
  }
}

export function sameJson(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameJson(value, right[index]));
  }
  if (typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && sameJson(left[key], right[key]));
}

export async function runPythonSuite(
  source: string,
  entrypoint: string,
  visible: PythonVisibleTest[],
  hidden: HiddenCase[],
  createSandbox: PythonSandboxFactory = () => Sandbox.create({ runtime: "python3.13", timeout: 10_000, networkPolicy: "deny-all", resources: { vcpus: 1 } })
) {
  const sandbox = await createSandbox();
  try {
    await sandbox.writeFiles([{ path: "/tmp/candidate.py", content: source }, { path: "/tmp/harness.py", content: HARNESS }]);
    const runCase = async (test: { args: JsonValue[]; expected: JsonValue }) => {
      try {
        const command = await sandbox.runCommand("python", ["/tmp/harness.py", entrypoint, JSON.stringify(test.args)], { timeoutMs: 2_000 });
        const result = parseResult(await command.stdout());
        return result.ok ? { ...result, passed: sameJson(result.value, test.expected) } : result;
      } catch {
        return { ok: false as const, kind: "timeout" as const };
      }
    };

    const visibleResults: VisibleRunResult[] = [];
    let status: "passed" | "failed" | "syntax_error" | "runtime_error" | "timeout" = "passed";
    for (const test of visible) {
      const result = await runCase(test);
      const passed = "passed" in result && result.passed;
      visibleResults.push({ name: test.name, passed, ...(passed ? {} : { error: result.ok ? "Returned a different value." : "Could not run this case." }) });
      if (!passed && status === "passed") status = result.ok ? "failed" : result.kind;
    }
    let hiddenPassed = 0;
    for (const test of hidden) {
      const result = await runCase(test);
      if ("passed" in result && result.passed) hiddenPassed += 1;
      else if (status === "passed") status = result.ok ? "failed" : result.kind;
    }
    return { status, visible: { passed: visibleResults.filter((test) => test.passed).length, total: visibleResults.length, tests: visibleResults }, hidden: { passed: hiddenPassed, total: hidden.length } };
  } finally {
    await sandbox.stop().catch(() => undefined);
  }
}
