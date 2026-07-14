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
  /** Where the prompt is being written — drives chat vs. agent optimization. */
  platform?: import('../adapters/platforms').PlatformProfile;
}

export interface LibraryPrompt {
  id: string;
  title: string;
  text: string;
  category?: string;
  createdAt: number;
}

export interface Settings {
  enabled: boolean;
  disabledSites: string[];
  theme: 'system' | 'light' | 'dark';
  /** Master switch for REMOTE providers (Anthropic/OpenAI). Ollama is local. */
  cloudEnabled: boolean;
  /** Anthropic API key. Network use only in the background worker. */
  apiKey?: string;
  /** OpenAI API key. Network use only in the background worker. */
  openaiKey?: string;
  /** Use a locally running Ollama (localhost:11434) — no key, nothing leaves the machine. */
  ollamaEnabled: boolean;
  /** Specific Ollama model; when unset the first installed model is used. */
  ollamaModel?: string;
  model: string;
  openaiModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  disabledSites: [],
  theme: 'system',
  cloudEnabled: false,
  ollamaEnabled: false,
  model: 'claude-sonnet-5',
  openaiModel: 'gpt-4o-mini',
};
