import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, isE164PhoneNumber, maskAccountSid, maskPhoneNumber, normalizeAllowedSenders, summarizeLlmCredential, twilioCredentialFailureMessage, validateAndroidGatewayUrl } from "./credentials";

describe("Lucy Twilio credentials", () => {
  it("encrypts and decrypts a token without storing the plaintext", () => {
    const token = "super-secret-twilio-token";
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toContain(token);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("classifies Twilio credential-test failures without exposing secrets", () => {
    expect(twilioCredentialFailureMessage(401)).toContain("Account SID/Auth Token pair");
    expect(twilioCredentialFailureMessage(404)).toContain("could not find this Account SID");
    expect(twilioCredentialFailureMessage(503)).toContain("temporarily unavailable");
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

  it("validates Android gateway endpoints and rejects unsafe production URLs", () => {
    expect(validateAndroidGatewayUrl("https://api.sms-gate.app/3rdparty/v1/")).toBe("https://api.sms-gate.app/3rdparty/v1");
    expect(() => validateAndroidGatewayUrl("ftp://gateway.example")).toThrow("http:// or https://");
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    expect(() => validateAndroidGatewayUrl("http://192.168.1.10:8080")).toThrow("HTTPS in production");
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("returns masked BYO LLM metadata without exposing the API key", () => {
    const status = summarizeLlmCredential({ provider: "openai-compatible", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", updatedAt: new Date() });
    expect(status).toMatchObject({ configured: true, provider: "openai-compatible", model: "gpt-4o-mini", apiKeyConfigured: true });
    expect(status).not.toHaveProperty("apiKey");
    expect(JSON.stringify(status)).not.toContain("sk-private");
  });
});
