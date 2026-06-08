export type MockExamDomain = {
  id: number;
  label: string;
  weight: string;
};

export type MockExamQuestion = {
  id: number;
  domain: number;
  text: string;
  options: string[];
  correct: number; // index into options
  explanation: string; // may contain inline HTML (<strong>/<code>/<br>)
};

export type MockExam = {
  id: string;
  title: string;
  description: string;
  passThreshold: number; // percent, e.g. 70
  domains: MockExamDomain[];
  questions: MockExamQuestion[];
};
