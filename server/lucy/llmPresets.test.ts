import { describe, expect, it } from "vitest";
import { resolveLlmSettings } from "../../shared/llm";

describe("BYO LLM provider presets", () => {
  it("normalizes Groq to its compatible endpoint and default model", () => {
    expect(resolveLlmSettings({ provider: "Groq", apiKey: "gsk_test_key_123456789", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" })).toEqual({ provider: "groq", apiKey: "gsk_test_key_123456789", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" });
  });

  it("rejects an incomplete Groq key before any network call", () => {
    expect(() => resolveLlmSettings({ provider: "groq", apiKey: "sk-not-groq", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" })).toThrow("gsk_");
  });

  it("preserves custom compatible endpoint settings for supported non-Groq providers", () => {
    expect(resolveLlmSettings({ provider: "openai-compatible", apiKey: "sk_custom_key_123", baseUrl: "https://example.test/v1/", model: "custom-model" })).toMatchObject({ provider: "openai-compatible", baseUrl: "https://example.test/v1", model: "custom-model" });
  });

  it("rejects unsupported provider names", () => {
    expect(() => resolveLlmSettings({ provider: "unknown", apiKey: "secret-key-123", baseUrl: "https://example.test/v1", model: "custom-model" })).toThrow("supported LLM provider");
  });
});
