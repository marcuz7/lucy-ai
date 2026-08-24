import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("./credentials", () => ({ getTelnyxCredentialsForWebhook: vi.fn(async () => null) }));

import { TelnyxAdapter, verifyTelnyxSignature } from "./telnyxWebhook";

describe("Telnyx webhook security", () => {
  it("accepts a valid Ed25519 signature over timestamp and raw JSON", () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const timestamp = "1787579999";
    const rawBody = Buffer.from(JSON.stringify({ data: { event_type: "message.received" } }));
    const signature = crypto.sign(null, Buffer.from(`${timestamp}|${rawBody.toString("utf8")}`), privateKey).toString("base64");
    const request = { rawBody, get: (name: string) => ({ "telnyx-signature-ed25519": signature, "telnyx-timestamp": timestamp }[name.toLowerCase()]) } as never;

    expect(verifyTelnyxSignature(request, publicKey.export({ type: "spki", format: "pem" }).toString())).toBe(true);
  });

  it("dispatches outbound SMS through the Telnyx messages API", async () => {
    vi.stubEnv("TELNYX_API_KEY", "KEY_test_telnyx");
    vi.stubEnv("TELNYX_PHONE_NUMBER", "+15551234567");
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: "telnyx-message-1" } }) }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new TelnyxAdapter().sendText("+15557654321", "Lucy found an answer.")).resolves.toEqual({ providerMessageId: "telnyx-message-1" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.telnyx.com/v2/messages", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ Authorization: "Bearer KEY_test_telnyx" }), body: JSON.stringify({ from: "+15551234567", to: "+15557654321", text: "Lucy found an answer." }) }));
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects tampered payloads and missing signature headers", () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const timestamp = "1787579999";
    const rawBody = Buffer.from('{"data":{"event_type":"message.received"}}');
    const signature = crypto.sign(null, Buffer.from(`${timestamp}|${rawBody.toString("utf8")}`), privateKey).toString("base64");
    const validHeaders = { "telnyx-signature-ed25519": signature, "telnyx-timestamp": timestamp };
    const request = { rawBody: Buffer.from('{"data":{"event_type":"message.finalized"}}'), get: (name: string) => validHeaders[name.toLowerCase()] } as never;
    const missingHeaderRequest = { rawBody, get: () => undefined } as never;
    const pem = publicKey.export({ type: "spki", format: "pem" }).toString();

    expect(verifyTelnyxSignature(request, pem)).toBe(false);
    expect(verifyTelnyxSignature(missingHeaderRequest, pem)).toBe(false);
  });
});
