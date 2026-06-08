import apiTesting from "@/data/cheatsheets/api-testing.json";
import appium from "@/data/cheatsheets/appium.json";
import ccaFoundations from "@/data/cheatsheets/cca-foundations.json";
import csharp from "@/data/cheatsheets/csharp.json";
import docker from "@/data/cheatsheets/docker.json";
import java from "@/data/cheatsheets/java.json";
import javascript from "@/data/cheatsheets/javascript.json";
import kubernetes from "@/data/cheatsheets/kubernetes.json";
import playwright from "@/data/cheatsheets/playwright.json";
import pyspark from "@/data/cheatsheets/pyspark.json";
import python from "@/data/cheatsheets/python.json";
import selenium from "@/data/cheatsheets/selenium.json";
import sql from "@/data/cheatsheets/sql.json";
import testng from "@/data/cheatsheets/testng.json";
import xcuitest from "@/data/cheatsheets/xcuitest.json";
import type { CheatSheet, CheatSheetGroup } from "@/types/CheatSheet";
import type { Question } from "@/types/Question";

// Curated display order, grouped to mirror the source study hub.
const cheatSheetData = [
  playwright,
  selenium,
  testng,
  xcuitest,
  appium,
  apiTesting,
  sql,
  pyspark,
  docker,
  kubernetes,
  python,
  java,
  javascript,
  csharp,
  ccaFoundations,
] as CheatSheet[];

export const cheatSheets = cheatSheetData;

const GROUP_ORDER: CheatSheetGroup[] = ["Test Frameworks", "API & Data", "DevOps & CI", "Languages", "Certifications"];

export function getCheatSheet(id: string): CheatSheet | undefined {
  return cheatSheets.find((sheet) => sheet.id === id);
}

export function getCheatSheetQuiz(id: string): Question[] {
  return getCheatSheet(id)?.quiz ?? [];
}

export type CheatSheetSelfTest = { href: string; kind: "quiz" | "exam" };

// Single source of truth for a sheet's self-test: an inline quiz wins; otherwise a linked mock
// exam; otherwise none. Used by both the cheat-sheet card and the detail page so they can't drift.
export function cheatSheetSelfTest(sheet: CheatSheet): CheatSheetSelfTest | null {
  if (sheet.quiz.length > 0) return { href: `/cheatsheets/${sheet.id}/quiz`, kind: "quiz" };
  if (sheet.mockExamId) return { href: `/mock-exam/${sheet.mockExamId}`, kind: "exam" };
  return null;
}

export type CheatSheetGroupBucket = { group: CheatSheetGroup; sheets: CheatSheet[] };

export function cheatSheetsByGroup(): CheatSheetGroupBucket[] {
  return GROUP_ORDER.map((group) => ({
    group,
    sheets: cheatSheets.filter((sheet) => sheet.group === group),
  })).filter((bucket) => bucket.sheets.length > 0);
}
