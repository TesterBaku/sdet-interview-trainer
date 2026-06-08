import apiTesting from "@/data/cheatsheets/api-testing.json";
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
  apiTesting,
  sql,
  pyspark,
  docker,
  kubernetes,
  python,
  java,
  javascript,
  csharp,
] as CheatSheet[];

export const cheatSheets = cheatSheetData;

const GROUP_ORDER: CheatSheetGroup[] = ["Test Frameworks", "API & Data", "DevOps & CI", "Languages"];

export function getCheatSheet(id: string): CheatSheet | undefined {
  return cheatSheets.find((sheet) => sheet.id === id);
}

export function getCheatSheetQuiz(id: string): Question[] {
  return getCheatSheet(id)?.quiz ?? [];
}

export type CheatSheetGroupBucket = { group: CheatSheetGroup; sheets: CheatSheet[] };

export function cheatSheetsByGroup(): CheatSheetGroupBucket[] {
  return GROUP_ORDER.map((group) => ({
    group,
    sheets: cheatSheets.filter((sheet) => sheet.group === group),
  })).filter((bucket) => bucket.sheets.length > 0);
}
