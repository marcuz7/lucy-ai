import express from "express";
import http from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getTwilioCredentialsForWebhook } = vi.hoisted(() => ({ getTwilioCredentialsForWebhook: vi.fn(async () => null) }));
const { enqueueMessage } = vi.hoisted(() => ({ enqueueMessage: vi.fn(async () => undefined) }));

vi.mock("./credentials", () => ({ getTwilioCredentialsForWebhook }));
vi.mock("./queue", () => ({ enqueueMessage }));
vi.mock("./memory", () => ({ memoryStore: { optOut: vi.fn(async () => undefined), optIn: vi.fn(async () => undefined), isOptedOut: vi.fn(async () => false) } }));

import { registerTwilioWebhook } from "./twilioWebhook";

type ResponseData = { status: number; body: string };

function request(server: http.Server, body: Record<string, string>, headers: Record<string, string> = {}) {
  return new Promise<ResponseData>((resolve, reject) => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("Server did not bind"));
    const payload = new URLSearchParams(body).toString();
    const request = http.request({ hostname: "127.0.0.1", port: address.port, path: "/api/webhooks/twilio/incoming", method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "content-length": Buffer.byteLength(payload), ...headers } }, response => {
      const chunks: Buffer[] = [];
      response.on("data", chunk => chunks.push(Buffer.from(chunk)));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.on("error", reject);
    request.end(payload);
  });
}

describe("Twilio webhook security", () => {
  let server: http.Server;
  afterEach(() => server?.close());

  it("acks a valid unsigned local stub request and enqueues the message", async () => {
    getTwilioCredentialsForWebhook.mockResolvedValueOnce(null);
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    registerTwilioWebhook(app);
    server = app.listen(0);

    const response = await request(server, { From: "+15550000000", To: "+15551111111", Body: "Lucy, look up the weather", MessageSid: "SM-local-1" });

    expect(response.status).toBe(200);
    expect(response.body).toBe("");
    expect(enqueueMessage).toHaveBeenCalledOnce();
  });

  it("rejects a request when configured Twilio credentials have no valid signature", async () => {
    getTwilioCredentialsForWebhook.mockResolvedValueOnce({ accountSid: "AC12345678901234567890123456789012", authToken: "test-auth-token", phoneNumber: "+15551111111" });
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    registerTwilioWebhook(app);
    server = app.listen(0);

    const response = await request(server, { From: "+15550000000", To: "+15551111111", Body: "Lucy, run a safe lookup", MessageSid: "SM-signed-1" });

    expect(response.status).toBe(403);
    expect(response.body).toContain("Invalid Twilio signature");
  });
});
