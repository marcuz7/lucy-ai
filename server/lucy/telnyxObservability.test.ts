import { describe, expect, it } from "vitest";
import { createAgentRun } from "./agentPersistence";
import { getAgentRuns } from "./dashboard";
import type { InboundMessage } from "./types";

const message: InboundMessage = {
  id: `telnyx-observability-${Date.now()}`,
  channel: "telnyx-sms",
  senderId: "+15557654321",
  chatId: "+15557654321",
  text: "Lucy, search the web for a public answer",
  timestamp: Date.now(),
  media: [],
};

describe("Telnyx admin observability", () => {
  it("returns Telnyx-originated execution runs to the control plane query", async () => {
    await createAgentRun(message);
    const runs = await getAgentRuns();

    expect(runs.some(run => run.senderId === message.senderId && run.requestText === message.text)).toBe(true);
  });
});
