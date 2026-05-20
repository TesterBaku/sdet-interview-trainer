export type Topic = {
  id: string;
  title: string;
  description: string;
  category: "coding" | "automation" | "cloud" | "strategy" | "database";
  questionCount: number;
  difficulty: "mid" | "senior" | "mixed";
};
