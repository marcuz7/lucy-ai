import express from "express";
import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueMessage: vi.fn(async () => undefined),
  memoryStore: { optOut: vi.fn(), optIn: vi.fn() },
}));

vi.mock("./credentials", () => ({ getTelnyxCredentialsForWebhook: vi.fn(async () => null) }));
vi.mock("./queue", () => ({ enqueueMessage: mocks.enqueueMessage }));
vi.mock("./memory", () => ({ memoryStore: mocks.memoryStore }));

import { registerTelnyxWebhook } from "./telnyxWebhook";

describe("Telnyx inbound route", () => {
  const app = express();
  const server = createServer(app);
  let baseUrl = "";

  beforeAll(async () => {
    app.use(express.json({ verify: (req, _res, body) => { (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(body); } }));
    registerTelnyxWebhook(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address !== "string") baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    }));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it("acknowledges and enqueues normalized inbound SMS without waiting for the agent", async () => {
    const response = await fetch(`${baseUrl}/api/webhooks/telnyx/incoming`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: { id: "event-1", event_type: "message.received", payload: { id: "telnyx-in-1", text: "Lucy, search the web", from: { phone_number: "+15557654321" }, to: [{ phone_number: "+15551234567" }], media: [] } } }),
    });

    expect(response.status).toBe(200);
    expect(mocks.enqueueMessage).toHaveBeenCalledTimes(1);
    const [message] = mocks.enqueueMessage.mock.calls[0] ?? [];
    expect(message).toMatchObject({ id: "telnyx-in-1", channel: "telnyx-sms", senderId: "+15557654321", chatId: "+15557654321", text: "Lucy, search the web", media: [] });
  });
});
