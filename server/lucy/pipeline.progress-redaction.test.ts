import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboundMessage } from "./types";

const mocks = vi.hoisted(() => ({
  recordConversationEvent: vi.fn(),
  runManagedAgent: vi.fn(),
  memoryStore: {
    isOptedOut: vi.fn(async () => false),
    saveInbound: vi.fn(async () => undefined),
    snapshot: vi.fn(async () => ({ working: [], facts: {}, retrieved: [] })),
    saveDecision: vi.fn(async () => undefined),
    appendTurn: vi.fn(async () => undefined),
  },
}));

vi.mock("./history", () => ({ recordConversationEvent: mocks.recordConversationEvent }));
vi.mock("./agent", () => ({ runManagedAgent: mocks.runManagedAgent }));
vi.mock("./memory", () => ({ memoryStore: mocks.memoryStore }));

import { processInbound } from "./pipeline";

const message: InboundMessage = {
  id: "progress-redaction-message",
  channel: "twilio-sms",
  senderId: "+15550000000",
  chatId: "+15550000000",
  text: "Lucy, check this public source",
  timestamp: Date.now(),
  media: [],
};

describe("Lucy progress redaction pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runManagedAgent.mockImplementation(async ({ onProgress }: { onProgress?: (event: unknown) => Promise<void> }) => {
      await onProgress?.({ runId: "run-1", chatId: message.chatId, text: "token=sk-progress-secret +15550000000", kind: "tool" });
      return { runId: "run-1", status: "completed", text: "Done." };
    });
  });

  it("persists and sends progress only after secret redaction", async () => {
    const sent: string[] = [];
    const adapter = { sendText: vi.fn(async (_recipient: string, text: string) => { sent.push(text); return {}; }) };

    await processInbound(message, adapter);

    const progressEvent = mocks.recordConversationEvent.mock.calls.map(([event]) => event).find((event: { role: string; text: string }) => event.role === "system");
    expect(progressEvent?.text).toBe("Lucy progress: [redacted] [redacted-phone]");
    expect(sent).toContain("[redacted] [redacted-phone]");
    expect(sent).not.toContain("token=sk-progress-secret +15550000000");
  });
});
