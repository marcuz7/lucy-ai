import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isE164PhoneNumber, maskAccountSid, maskPhoneNumber, normalizeAllowedSenders, summarizeLlmCredential } from "./credentials";

describe("Lucy Twilio credentials", () => {
  it("encrypts and decrypts a token without storing the plaintext", () => {
    const token = "super-secret-twilio-token";
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toContain(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("masks account and phone identifiers", () => {
    expect(maskAccountSid("AC1234567890")).toBe("AC••••••7890");
    expect(maskPhoneNumber("+15551234567")).toBe("••••••••4567");
  });

  it("accepts valid international E.164 numbers and rejects malformed values", () => {
    expect(isE164PhoneNumber("+84837841663")).toBe(true);
    expect(isE164PhoneNumber("+15551234567")).toBe(true);
    expect(isE164PhoneNumber("+84 837841663")).toBe(false);
    expect(isE164PhoneNumber("15551234567")).toBe(false);
    expect(isE164PhoneNumber("+abc")).toBe(false);
  });

  it("normalizes only unique E.164 sender numbers", () => {
    expect(normalizeAllowedSenders(["+15550000000, +15550000000", "bad", "+15550000001"])).toEqual(["+15550000000", "+15550000001"]);
  });

  it("returns masked BYO LLM metadata without exposing the API key", () => {
    const status = summarizeLlmCredential({ provider: "openai-compatible", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", updatedAt: new Date() });
    expect(status).toMatchObject({ configured: true, provider: "openai-compatible", model: "gpt-4o-mini", apiKeyConfigured: true });
    expect(status).not.toHaveProperty("apiKey");
    expect(JSON.stringify(status)).not.toContain("sk-private");
  });
});
