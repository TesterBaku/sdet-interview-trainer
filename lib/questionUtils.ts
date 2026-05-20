import topicsData from "@/data/topics.json";
import apiTesting from "@/data/questions/api-testing.json";
import aws from "@/data/questions/aws.json";
import cicd from "@/data/questions/cicd.json";
import javaCoding from "@/data/questions/java-coding.json";
import playwrightPython from "@/data/questions/playwright-python.json";
import playwrightTypescript from "@/data/questions/playwright-typescript.json";
import pythonCoding from "@/data/questions/python-coding.json";
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

export function getWeakTopicIds(records: { questionId: string; status: string }[]): string[] {
  const weakQuestionIds = new Set(
    records.filter((record) => record.status === "weak").map((record) => record.questionId)
  );

  return topics
    .filter((topic) => getQuestionsByTopic(topic.id).some((question) => weakQuestionIds.has(question.id)))
    .map((topic) => topic.id);
}
