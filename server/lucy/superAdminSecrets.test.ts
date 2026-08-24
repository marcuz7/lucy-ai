import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("../db", () => ({ getDb }));

import { getLlmCredentialStatus, getTavilyCredentialStatus, getTelnyxCredentialStatus, getTwilioCredentialStatus } from "./credentials";

describe("super-admin credential redaction boundary", () => {
  beforeEach(() => {
    getDb.mockReset();
  });

  it("never returns plaintext secrets from provider status responses", async () => {
    const secret = "plaintext-secret-must-never-leak";
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{
              accountSid: "AC1234567890",
              authTokenEncrypted: secret,
              apiKeyEncrypted: secret,
              publicKey: "-----BEGIN PUBLIC KEY-----",
              phoneNumber: "+15551234567",
              allowedSenders: JSON.stringify(["+15550000001"]),
              provider: "groq",
              baseUrl: "https://api.groq.com/openai/v1",
              model: "llama-3.3-70b-versatile",
              updatedAt: new Date(),
            }],
          }),
        }),
      }),
    };
    getDb.mockResolvedValue(db);

    const statuses = await Promise.all([
      getTwilioCredentialStatus(42),
      getTelnyxCredentialStatus(42),
      getLlmCredentialStatus(42),
      getTavilyCredentialStatus(42),
    ]);

    expect(JSON.stringify(statuses)).not.toContain(secret);
    expect(statuses[0]).toMatchObject({ configured: true, accountSid: "AC••••••7890" });
    expect(statuses[1]).toMatchObject({ configured: true, phoneNumber: "••••••••4567" });
    expect(statuses[2]).toMatchObject({ configured: true, provider: "groq" });
    expect(statuses[3]).toMatchObject({ configured: true, provider: "groq" });
  });
});
