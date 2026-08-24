import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb }));

import { encryptSecret, testTavilyCredentials } from "./credentials";

describe("Tavily credential connection test", () => {
  beforeEach(() => {
    getDb.mockReset();
    vi.restoreAllMocks();
  });

  it("returns an actionable rejection message when Tavily denies the key", async () => {
    const row = { apiKeyEncrypted: encryptSecret("tvly-private-key") };
    getDb.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ limit: async () => [row] }) }) }) });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ detail: "invalid key" }), { status: 401 }));

    await expect(testTavilyCredentials(42)).resolves.toEqual({ ok: false, message: "Tavily rejected this API key. Check the key and try again." });
  });
});
