export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type CodeRunRequest = {
  questionId: string;
  language: "python";
  source: string;
  turnstileToken: string;
};

export type VisibleRunResult = { name: string; passed: boolean; error?: string };

export type CodeRunResponse = {
  status: "passed" | "failed" | "syntax_error" | "runtime_error" | "timeout" | "rejected";
  visible: { passed: number; total: number; tests: VisibleRunResult[] };
  hidden: { passed: number; total: number };
};
