import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runManagedAgent: vi.fn(),
  recordConversationEvent: vi.fn(async () => undefined),
  memoryStore: {
    isOptedOut: vi.fn(async () => false),
    saveInbound: vi.fn(async () => undefined),
    snapshot: vi.fn(async () => ({ working: [], facts: {}, retrieved: [] })),
    saveDecision: vi.fn(async () => undefined),
    appendTurn: vi.fn(async () => undefined),
  },
}));

vi.mock("./credentials", () => ({ getTelnyxCredentialsForWebhook: vi.fn(async () => null) }));
vi.mock("./agent", () => ({ runManagedAgent: mocks.runManagedAgent }));
vi.mock("./history", () => ({ recordConversationEvent: mocks.recordConversationEvent }));
vi.mock("./memory", () => ({ memoryStore: mocks.memoryStore }));

import { processInbound } from "./pipeline";
import { TelnyxAdapter } from "./telnyxWebhook";
import type { InboundMessage } from "./types";

const message: InboundMessage = {
  id: "telnyx-p0-search-1",
  channel: "telnyx-sms",
  senderId: "+15557654321",
  chatId: "+15557654321",
  text: "Lucy, search the web for the latest weather in Tokyo",
  timestamp: Date.now(),
  media: [],
};

describe("Telnyx P0 search-to-reply path", () => {
  it("sends the managed-agent result through Telnyx", async () => {
    vi.stubEnv("TELNYX_API_KEY", "KEY_test_telnyx");
    vi.stubEnv("TELNYX_PHONE_NUMBER", "+15551234567");
    mocks.runManagedAgent.mockResolvedValueOnce({ runId: "run-p0-1", status: "completed", text: "Tokyo is clear and 24°C today." });
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: "telnyx-out-1" } }) }));
    vi.stubGlobal("fetch", fetchMock);

    await processInbound(message, new TelnyxAdapter());

    expect(mocks.runManagedAgent).toHaveBeenCalledWith(expect.objectContaining({ message }));
    expect(fetchMock).toHaveBeenCalledWith("https://api.telnyx.com/v2/messages", expect.objectContaining({ body: JSON.stringify({ from: "+15551234567", to: "+15557654321", text: "Tokyo is clear and 24°C today." }) }));
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
