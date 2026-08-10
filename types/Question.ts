export type PythonVisibleTest = {
  name: string;
  args: unknown[];
  expected: unknown;
};

export type PythonRunner = {
  language: "python";
  entrypoint: string;
  visibleTests: PythonVisibleTest[];
};

export type Question = {
  id: string;
  topicId: string;
  topicTitle: string;
  level: "mid" | "senior";
  type: "interview" | "quiz" | "coding" | "scenario";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  shortAnswer?: string;
  interviewAnswer?: string;
  realProjectExample?: string;
  followUps?: string[];
  choices?: string[];
  correctAnswer?: string;
  explanation?: string;
  title?: string;
  problem?: string;
  inputExample?: string;
  expectedOutput?: string;
  hint?: string;
  solutionLanguage?: "python" | "java" | "typescript" | "sql";
  runner?: PythonRunner;
  solution?: string;
  commonMistakes?: string[];
  tags: string[];
};
