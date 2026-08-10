import "server-only";

import type { JsonValue } from "@/lib/coding/contracts";

export type HiddenCase = { args: JsonValue[]; expected: JsonValue };
export type HiddenSuite = { language: "python"; entrypoint: string; tests: HiddenCase[] };

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return typeof value === "object" && value !== null && Object.values(value).every(isJsonValue);
}

function parseSuites(raw: string): Record<string, HiddenSuite> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1) return null;
    const suites = (parsed as { suites?: unknown }).suites;
    if (!suites || typeof suites !== "object" || Array.isArray(suites)) return null;
    const entries = Object.entries(suites);
    if (!entries.every(([id, suite]) => {
      if (!id || !suite || typeof suite !== "object") return false;
      const candidate = suite as Partial<HiddenSuite>;
      return candidate.language === "python" && typeof candidate.entrypoint === "string" && candidate.entrypoint.length > 0 && Array.isArray(candidate.tests) && candidate.tests.length > 0 && candidate.tests.every((test) => !!test && typeof test === "object" && Array.isArray((test as HiddenCase).args) && isJsonValue((test as HiddenCase).args) && isJsonValue((test as HiddenCase).expected));
    })) return null;
    return suites as Record<string, HiddenSuite>;
  } catch {
    return null;
  }
}

export function getHiddenSuite(questionId: string, language: "python", entrypoint: string) {
  const suites = parseSuites(process.env.CODING_HIDDEN_TEST_SUITES_JSON ?? "");
  const suite = suites?.[questionId];
  return suite && suite.language === language && suite.entrypoint === entrypoint ? suite : null;
}
