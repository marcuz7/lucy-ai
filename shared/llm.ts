export const LLM_PRESETS = {
  groq: {
    label: "Groq",
    provider: "groq",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  "openai-compatible": {
    label: "OpenAI-compatible",
    provider: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  custom: {
    label: "Custom compatible endpoint",
    provider: "custom",
    baseUrl: "https://example.com/v1",
    model: "your-model",
  },
} as const;

export type LlmProvider = keyof typeof LLM_PRESETS;

export function resolveLlmSettings(input: { provider: string; apiKey: string; baseUrl: string; model: string }) {
  const provider = input.provider.trim().toLowerCase() as LlmProvider;
  const preset = LLM_PRESETS[provider];
  if (!preset) throw new Error("Choose a supported LLM provider");
  const apiKey = input.apiKey.trim();
  if (provider === "groq" && !/^gsk_[A-Za-z0-9_-]{8,}$/.test(apiKey)) {
    throw new Error("Groq API keys must start with gsk_ and contain the full key");
  }
  return {
    provider,
    apiKey,
    baseUrl: provider === "groq" ? preset.baseUrl : input.baseUrl.trim().replace(/\/+$/, ""),
    model: provider === "groq" ? preset.model : input.model.trim(),
  };
}
