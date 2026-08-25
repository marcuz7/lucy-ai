import { beforeEach, describe, expect, it, vi } from "vitest";

const { getTavilyApiKeyForAgent } = vi.hoisted(() => ({ getTavilyApiKeyForAgent: vi.fn() }));
vi.mock("./credentials", () => ({ getTavilyApiKeyForAgent }));

import { executeSafeAgentTool } from "./agentTools";

describe("Tavily-backed public web lookup", () => {
  beforeEach(() => {
    getTavilyApiKeyForAgent.mockReset();
    vi.restoreAllMocks();
  });

  it("uses Tavily when configured and returns normalized results", async () => {
    getTavilyApiKeyForAgent.mockResolvedValue("tvly-private-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ results: [{ title: "AI news", url: "https://example.com/ai", content: "A current summary." }] }), { status: 200, headers: { "content-type": "application/json" } }));

    const output = await executeSafeAgentTool("public_web_lookup", { query: "latest AI news", limit: 3 });
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({ query: "latest AI news", provider: "tavily", results: [{ title: "AI news", url: "https://example.com/ai", snippet: "A current summary." }] });
    expect(fetchSpy).toHaveBeenCalledWith("https://api.tavily.com/search", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer tvly-private-key" },
      body: JSON.stringify({ query: "latest AI news", max_results: 3, search_depth: "basic" }),
    }));
    expect(output).not.toContain("tvly-private-key");
  });
});
