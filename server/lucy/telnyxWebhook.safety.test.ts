import crypto from "node:crypto";
import express from "express";
import { createServer, request as httpRequest } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enqueueMessage: vi.fn(async () => undefined),
  memoryStore: { optOut: vi.fn(async () => undefined), optIn: vi.fn(async () => undefined) },
}));

vi.mock("./credentials", () => ({ getTelnyxCredentialsForWebhook: vi.fn(async () => null) }));
vi.mock("./queue", () => ({ enqueueMessage: mocks.enqueueMessage }));
vi.mock("./memory", () => ({ memoryStore: mocks.memoryStore }));

describe("Telnyx webhook safety", () => {
  const app = express();
  const server = createServer(app);
  const keys = crypto.generateKeyPairSync("ed25519");
  let baseUrl = "";

  beforeAll(async () => {
    vi.stubEnv("TELNYX_API_KEY", "KEY_test_telnyx");
    vi.stubEnv("TELNYX_PHONE_NUMBER", "+15551234567");
    vi.stubEnv("TELNYX_PUBLIC_KEY", keys.publicKey.export({ type: "spki", format: "pem" }).toString());
    vi.stubEnv("LUCY_TELNYX_ALLOWED_SENDERS", "+15550000001");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: "telnyx-outbound-safety" } }) })));
    app.use(express.json({ verify: (req, _res, body) => { (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(body); } }));
    const { registerTelnyxWebhook } = await import("./telnyxWebhook");
    registerTelnyxWebhook(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address && typeof address !== "string") baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    }));
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  async function post(eventId: string, sender: string, text: string) {
    const body = JSON.stringify({ data: { id: eventId, event_type: "message.received", payload: { id: eventId, text, from: { phone_number: sender }, to: [{ phone_number: "+15551234567" }], media: [] } } });
    const timestamp = String(Date.now());
    const signature = crypto.sign(null, Buffer.from(`${timestamp}|${body}`), keys.privateKey).toString("base64");
    return new Promise<{ status: number }>((resolve, reject) => {
      const url = new URL(`${baseUrl}/api/webhooks/telnyx/incoming`);
      const req = httpRequest({ hostname: url.hostname, port: Number(url.port), path: url.pathname, method: "POST", headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body), "telnyx-timestamp": timestamp, "telnyx-signature-ed25519": signature } }, response => { response.resume(); response.on("end", () => resolve({ status: response.statusCode ?? 0 })); });
      req.on("error", reject);
      req.end(body);
    });
  }

  it("rejects unknown senders and handles STOP before queueing work", async () => {
    const rejected = await post("safety-unknown", "+15550000009", "Lucy, search this");
    expect(rejected.status).toBe(200);
    expect(mocks.enqueueMessage).not.toHaveBeenCalled();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://api.telnyx.com/v2/messages", expect.objectContaining({ body: JSON.stringify({ from: "+15551234567", to: "+15550000009", text: "This Lucy number is not enabled for this sender." }) }));

    const stopped = await post("safety-stop", "+15550000001", "STOP");
    expect(stopped.status).toBe(200);
    expect(mocks.memoryStore.optOut).toHaveBeenCalledWith("+15550000001");
    expect(vi.mocked(fetch)).toHaveBeenCalledWith("https://api.telnyx.com/v2/messages", expect.objectContaining({ body: JSON.stringify({ from: "+15551234567", to: "+15550000001", text: "You’re unsubscribed. Reply START to opt back in." }) }));
    expect(mocks.enqueueMessage).not.toHaveBeenCalled();
  });

  it("blocks the 31st message from the same sender within an hour", async () => {
    for (let index = 0; index < 31; index += 1) await post(`safety-rate-${index}`, "+15550000001", `Lucy, search ${index}`);
    expect(mocks.enqueueMessage).toHaveBeenCalledTimes(30);
    expect(vi.mocked(fetch)).toHaveBeenLastCalledWith("https://api.telnyx.com/v2/messages", expect.objectContaining({ body: JSON.stringify({ from: "+15551234567", to: "+15550000001", text: "Lucy is taking a short break for this number. Try again later." }) }));
  });
});
