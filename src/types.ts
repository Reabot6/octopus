export interface Prerequisite {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  children?: Prerequisite[];
}

export interface MathProblem {
  originalProblem: string;
  prerequisites: Prerequisite[];
  similarProblem?: string;
  similarSolution?: SolutionStep[];
}

export interface SolutionStep {
  step: string;
  explanation: string;
  prerequisiteIds: string[]; // IDs of prerequisites used in this step
}

export type AppState = 'input' | 'analysis' | 'tree' | 'learning' | 'solution';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}
