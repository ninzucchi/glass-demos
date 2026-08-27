export const PROJECT_MODELS = [
  "Grok 4.6 High Fast",
  "Claude 4.6 Opus",
  "GPT-5.4",
  "Composer 2",
  "Gemini 3 Pro",
] as const;

export type ProjectModel = (typeof PROJECT_MODELS)[number];

export const PROJECT_BRANCHES = ["main", "canary", "nightly"] as const;

export type ProjectBranch = (typeof PROJECT_BRANCHES)[number];
