import { describe, expect, it } from "vitest";
import { buildSafeConversationExport } from "./conversationExport";

describe("safe conversation export", () => {
  it("keeps useful history while excluding private transport data", () => {
    const exported = buildSafeConversationExport(
      { channel: "sms", mediaCount: 1, receivedAt: "2026-08-24T00:00:00.000Z" },
      [{ role: "user", text: "Call +84837841663 tomorrow", createdAt: "2026-08-24T00:01:00.000Z" }],
      [{ status: "dead_letter", attempts: 3, createdAt: "2026-08-24T00:02:00.000Z", lastError: "secret provider payload" }],
    );

    expect(exported.message).toEqual({ channel: "sms", mediaCount: 1, receivedAt: "2026-08-24T00:00:00.000Z" });
    expect(exported.events[0]?.text).toContain("[redacted]");
    expect(exported.jobs[0]).toMatchObject({ status: "dead_letter", attempts: 3, errorPresent: true });
    expect(JSON.stringify(exported)).not.toContain("secret provider payload");
    expect(JSON.stringify(exported)).not.toContain("+84837841663");
  });
});
