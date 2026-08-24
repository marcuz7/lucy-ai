import { describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  messages: [{ id: "telnyx-dashboard-message", channel: "telnyx-sms", senderId: "+15557654321", chatId: "+15557654321", text: "Lucy, search the web", mediaCount: 0, receivedAt: new Date() }],
}));

vi.mock("../db", () => ({
  getDb: vi.fn(async () => ({
    select: vi.fn()
      .mockReturnValueOnce({ from: () => ({ groupBy: async () => [] }) })
      .mockReturnValueOnce({ from: () => ({ orderBy: () => ({ limit: async () => fixtures.messages }) }) }),
  })),
}));

import { getDashboardSummary } from "./dashboard";

describe("Telnyx dashboard inbox", () => {
  it("returns Telnyx-originated messages to the admin inbox query", async () => {
    const summary = await getDashboardSummary();

    expect(summary.messages).toContainEqual(expect.objectContaining({ id: "telnyx-dashboard-message", channel: "telnyx-sms", text: "Lucy, search the web" }));
  });
});
