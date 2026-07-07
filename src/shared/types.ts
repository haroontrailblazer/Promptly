export type Severity = 'info' | 'warn' | 'high';

export type Component =
  | 'clarity'
  | 'context'
  | 'constraints'
  | 'outputFormat'
  | 'objective'
  | 'ambiguity'
  | 'aiReadiness';

export type TaskType = 'coding' | 'writing' | 'research' | 'analysis' | 'general';

export interface Finding {
  checkId: string;
  component: Component;
  severity: Severity;
  message: string;
  suggestion: string;
}

export interface ScoreResult {
  overall: number;
  components: Record<Component, number>;
}

export interface AnalysisResult {
  findings: Finding[];
  score: ScoreResult;
  taskType: TaskType;
}

export interface Settings {
  enabled: boolean;
  disabledSites: string[];
  theme: 'system' | 'light' | 'dark';
  cloudEnabled: boolean;
  apiKey?: string;
  model: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  disabledSites: [],
  theme: 'system',
  cloudEnabled: false,
  model: 'claude-sonnet-5',
};
