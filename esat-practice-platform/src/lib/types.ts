import type { Difficulty, SectionId } from "./esat";

export interface Question {
  id: string;
  section: SectionId | string;
  topic: string;
  difficulty: Difficulty | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  /** "seed" for bundled content, "ai" for generated content. */
  source: "seed" | "ai";
  createdAt: string;
}

/** Shape returned by the model for a single generated question (no id/meta). */
export interface GeneratedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

export interface GenerateRequest {
  section: string;
  topic?: string;
  difficulty: string;
  count: number;
  /** Optional freeform instructions or source material to base questions on. */
  context?: string;
}
