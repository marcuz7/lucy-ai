import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLlmCredentialsForAgent: vi.fn(),
  invokeLLM: vi.fn(),
}));

vi.mock("./credentials", () => ({ getLlmCredentialsForAgent: mocks.getLlmCredentialsForAgent }));
vi.mock("../_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { hasConfiguredLucyLlm, invokeLucyLlm } from "./llmRouter";

describe("BYO LLM routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("BUILT_IN_FORGE_API_KEY", "built-in-key");
  });

  it("uses the built-in helper when no BYO key is configured", async () => {
    mocks.getLlmCredentialsForAgent.mockResolvedValueOnce(null);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    mocks.invokeLLM.mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "fallback" } }] });

    await expect(hasConfiguredLucyLlm()).resolves.toBe(true);
    await expect(invokeLucyLlm({ messages: [{ role: "user", content: "hello" }] })).resolves.toMatchObject({ choices: [{ message: { content: "fallback" } }] });
    expect(mocks.invokeLLM).toHaveBeenCalledOnce();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends the stored key only to the configured OpenAI-compatible endpoint", async () => {
    mocks.getLlmCredentialsForAgent.mockResolvedValue({ provider: "openai-compatible", apiKey: "sk-private", baseUrl: "https://example.test/v1", model: "test-model" });
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => ({ ok: true, json: async () => ({ choices: [{ message: { role: "assistant", content: "custom" } }] }), init }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(invokeLucyLlm({ messages: [{ role: "user", content: "hello" }], toolChoice: "auto", maxTokens: 100 })).resolves.toMatchObject({ choices: [{ message: { content: "custom" } }] });
    expect(fetchMock).toHaveBeenCalledWith("https://example.test/v1/chat/completions", expect.objectContaining({ headers: { "content-type": "application/json", authorization: "Bearer sk-private" } }));
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(payload.model).toBe("test-model");
    expect(payload.max_tokens).toBe(100);
    expect(payload.tool_choice).toBe("auto");
  });
});
