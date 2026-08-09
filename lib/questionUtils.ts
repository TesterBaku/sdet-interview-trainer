import topicsData from "@/data/topics.json";
import apiTesting from "@/data/questions/api-testing.json";
import aws from "@/data/questions/aws.json";
import cicd from "@/data/questions/cicd.json";
import javaCoding from "@/data/questions/java-coding.json";
import playwrightPython from "@/data/questions/playwright-python.json";
import playwrightTypescript from "@/data/questions/playwright-typescript.json";
import pythonCoding from "@/data/questions/python-coding.json";
import restAssured from "@/data/questions/rest-assured.json";
import selenium from "@/data/questions/selenium.json";
import sqlPostgresql from "@/data/questions/sql-postgresql.json";
import testAutomationStrategy from "@/data/questions/test-automation-strategy.json";
import type { Question } from "@/types/Question";
import { getDueReviewRecords } from "@/lib/reviewSchedule";
import type { ProgressRecord } from "@/types/Progress";
import type { Topic } from "@/types/Topic";

const questionSets = [
  pythonCoding,
  javaCoding,
  sqlPostgresql,
  selenium,
  playwrightPython,
  playwrightTypescript,
  restAssured,
  apiTesting,
  testAutomationStrategy,
  cicd,
  aws
] as Question[][];

export const topics = topicsData as Topic[];
export const allQuestions = questionSets.flat();

export function getTopic(topicId: string): Topic | undefined {
  return topics.find((topic) => topic.id === topicId);
}

export function getQuestionsByTopic(topicId: string): Question[] {
  return allQuestions.filter((question) => question.topicId === topicId);
}

export function getQuestion(questionId: string): Question | undefined {
  return allQuestions.find((question) => question.id === questionId);
}

export function getFlashcardQuestions(topicId: string): Question[] {
  // coding questions are handled exclusively in Coding Gym
  return getQuestionsByTopic(topicId).filter(
    (question) => question.type === "quiz" || question.type === "interview" || question.type === "scenario"
  );
}

export function getQuizQuestions(topicId: string): Question[] {
  return getQuestionsByTopic(topicId).filter(
    (question) => question.type === "quiz" && question.choices?.length && question.correctAnswer
  );
}

export function getInterviewQuestions(topicId: string): Question[] {
  return getQuestionsByTopic(topicId).filter(
    (question) => question.type === "interview" || question.type === "scenario"
  );
}

export function getCodingQuestions(): Question[] {
  return allQuestions.filter((question) => question.type === "coding");
}

export function getCodingQuestionsByTopic(topicId: string): Question[] {
  return getQuestionsByTopic(topicId).filter((question) => question.type === "coding");
}

export type DailyPlanSection = {
  id: string;
  title: string;
  questions: Question[];
};

// Stable per-day plan: same calendar date returns the same picks until midnight.
// Picks rotate by day so the user sees fresh items each morning.
function dayKey(date: Date): number {
  return Math.floor(date.getTime() / (24 * 60 * 60 * 1000));
}

function rotatePickExcluding(
  pool: Question[],
  count: number,
  seed: number,
  excludedIds: ReadonlySet<string>,
): Question[] {
  if (pool.length === 0 || count <= 0) return [];
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const start = ((seed % sorted.length) + sorted.length) % sorted.length;
  const picks: Question[] = [];
  for (let i = 0; i < sorted.length && picks.length < count; i++) {
    const candidate = sorted[(start + i) % sorted.length];
    if (!excludedIds.has(candidate.id)) picks.push(candidate);
  }
  return picks;
}

const NO_EXCLUSIONS: ReadonlySet<string> = new Set();

/** The calendar-only plan excludes nothing; one rotation implementation serves both plans. */
function rotatePick(pool: Question[], count: number, seed: number): Question[] {
  return rotatePickExcluding(pool, count, seed, NO_EXCLUSIONS);
}

function pickDueFirst(pool: Question[], count: number, seed: number, dueRecords: ProgressRecord[]): Question[] {
  const questionById = new Map(pool.map((question) => [question.id, question]));
  const selectedDue = dueRecords
    .map((record) => questionById.get(record.questionId))
    .filter((question): question is Question => Boolean(question))
    .slice(0, count);
  const selectedIds = new Set(selectedDue.map((question) => question.id));
  return [...selectedDue, ...rotatePickExcluding(pool, count - selectedDue.length, seed, selectedIds)];
}

/** Single source of truth for the lanes a daily plan must contain. */
export const DAILY_PLAN_SECTION_IDS = ["coding", "sql", "browser", "platform", "strategy"] as const;
export type DailyPlanSectionId = (typeof DAILY_PLAN_SECTION_IDS)[number];

type DailyPlanSectionSpec = {
  id: DailyPlanSectionId;
  title: string;
  count: number;
  seedOffset: number;
  pool: Question[];
};

/** Shared by both plan builders so the calendar-only and adaptive plans cannot drift. */
function getDailyPlanSpec(): DailyPlanSectionSpec[] {
  return [
    {
      id: "coding",
      title: "Python / Java coding",
      count: 3,
      seedOffset: 0,
      pool: allQuestions.filter(
        (q) => (q.topicId === "python-coding" || q.topicId === "java-coding") && q.type === "coding"
      ),
    },
    { id: "sql", title: "SQL", count: 2, seedOffset: 1, pool: getQuestionsByTopic("sql-postgresql") },
    {
      id: "browser",
      title: "Playwright / Selenium",
      count: 2,
      seedOffset: 2,
      pool: [
        ...getQuestionsByTopic("playwright-python"),
        ...getQuestionsByTopic("playwright-typescript"),
        ...getQuestionsByTopic("selenium"),
      ],
    },
    {
      id: "platform",
      title: "API / CI/CD / AWS",
      count: 2,
      seedOffset: 3,
      pool: [
        ...getQuestionsByTopic("rest-assured"),
        ...getQuestionsByTopic("api-testing"),
        ...getQuestionsByTopic("cicd"),
        ...getQuestionsByTopic("aws"),
      ],
    },
    { id: "strategy", title: "Strategy / Mock", count: 1, seedOffset: 4, pool: getQuestionsByTopic("test-automation-strategy") },
  ];
}

/** Calendar-only baseline. Keep this pure so the server and browser agree. */
export function getDailyPlan(date: Date = new Date()): DailyPlanSection[] {
  const seed = dayKey(date);
  return getDailyPlanSpec().map((section) => ({
    id: section.id,
    title: section.title,
    questions: rotatePick(section.pool, section.count, seed + section.seedOffset),
  }));
}

/** Called only when creating a persisted daily snapshot, never during render. */
export function getAdaptiveDailyPlan(date: Date, records: ProgressRecord[]): {
  plan: DailyPlanSection[];
  dueQuestionIds: string[];
} {
  const seed = dayKey(date);
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  // Resolved once and shared across every lane: this previously ran per lane
  // plus once more for the due-id set, filtering and sorting the same array
  // six times to build one snapshot.
  const dueRecords = getDueReviewRecords(records, endOfDay);
  const plan = getDailyPlanSpec().map((section) => ({
    id: section.id,
    title: section.title,
    questions: pickDueFirst(section.pool, section.count, seed + section.seedOffset, dueRecords),
  }));
  const dueIds = new Set(dueRecords.map((record) => record.questionId));
  return { plan, dueQuestionIds: plan.flatMap((section) => section.questions).filter((q) => dueIds.has(q.id)).map((q) => q.id) };
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getWeakTopicIds(records: { questionId: string; status: string }[]): string[] {
  const weakQuestionIds = new Set(
    records.filter((record) => record.status === "weak").map((record) => record.questionId)
  );

  return topics
    .filter((topic) => getQuestionsByTopic(topic.id).some((question) => weakQuestionIds.has(question.id)))
    .map((topic) => topic.id);
}
