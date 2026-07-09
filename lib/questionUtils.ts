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

function rotatePick(pool: Question[], count: number, seed: number): Question[] {
  if (pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const start = ((seed % sorted.length) + sorted.length) % sorted.length;
  const picks: Question[] = [];
  for (let i = 0; i < Math.min(count, sorted.length); i++) {
    picks.push(sorted[(start + i) % sorted.length]);
  }
  return picks;
}

export function getDailyPlan(date: Date = new Date()): DailyPlanSection[] {
  const seed = dayKey(date);

  const codingPool = allQuestions.filter(
    (q) => (q.topicId === "python-coding" || q.topicId === "java-coding") && q.type === "coding"
  );
  const sqlPool = getQuestionsByTopic("sql-postgresql");
  const browserPool = [
    ...getQuestionsByTopic("playwright-python"),
    ...getQuestionsByTopic("playwright-typescript"),
    ...getQuestionsByTopic("selenium"),
  ];
  const platformPool = [
    ...getQuestionsByTopic("rest-assured"),
    ...getQuestionsByTopic("api-testing"),
    ...getQuestionsByTopic("cicd"),
    ...getQuestionsByTopic("aws"),
  ];
  const strategyPool = getQuestionsByTopic("test-automation-strategy");

  return [
    { id: "coding", title: "Python / Java coding", questions: rotatePick(codingPool, 3, seed) },
    { id: "sql", title: "SQL", questions: rotatePick(sqlPool, 2, seed + 1) },
    { id: "browser", title: "Playwright / Selenium", questions: rotatePick(browserPool, 2, seed + 2) },
    { id: "platform", title: "API / CI/CD / AWS", questions: rotatePick(platformPool, 2, seed + 3) },
    { id: "strategy", title: "Strategy / Mock", questions: rotatePick(strategyPool, 1, seed + 4) },
  ];
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
