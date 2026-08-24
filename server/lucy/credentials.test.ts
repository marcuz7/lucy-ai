import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, maskAccountSid, maskPhoneNumber } from "./credentials";

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
});
