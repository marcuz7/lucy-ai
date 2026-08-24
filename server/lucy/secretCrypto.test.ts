import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, reEncryptSecret } from "./credentials";

const masterKey = process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY;
const originalJwtSecret = process.env.JWT_SECRET;

function legacyEncrypt(value: string) {
  const key = crypto.createHash("sha256").update(originalJwtSecret ?? "").digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

describe("dedicated credential encryption", () => {
  afterEach(() => {
    if (masterKey) process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY = masterKey;
    else delete process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY;
    if (originalJwtSecret) process.env.JWT_SECRET = originalJwtSecret;
  });

  it("uses the configured master key for authenticated versioned round trips", () => {
    expect(masterKey).toBeTruthy();
    const encrypted = encryptSecret("provider-secret");
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(decryptSecret(encrypted)).toBe("provider-secret");
  });

  it("continues to decrypt legacy JWT-derived records during migration", () => {
    expect(originalJwtSecret).toBeTruthy();
    const encrypted = legacyEncrypt("legacy-provider-secret");
    expect(encrypted.startsWith("v1.")).toBe(false);
    expect(decryptSecret(encrypted)).toBe("legacy-provider-secret");
  });

  it("re-encrypts a record from the previous key under the new active key", () => {
    const previousKey = Buffer.alloc(32, 11).toString("base64");
    const activeKey = Buffer.alloc(32, 22).toString("base64");
    process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY = previousKey;
    delete process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS;
    const oldCiphertext = encryptSecret("rotating-provider-secret");

    process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY = activeKey;
    process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS = previousKey;
    expect(decryptSecret(oldCiphertext)).toBe("rotating-provider-secret");

    const newCiphertext = reEncryptSecret(oldCiphertext);
    expect(newCiphertext).not.toBe(oldCiphertext);
    delete process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS;
    expect(decryptSecret(newCiphertext)).toBe("rotating-provider-secret");
    expect(() => decryptSecret(oldCiphertext)).toThrow("Unable to decrypt provider credential with the active key ring");
  });

  it("fails closed when the dedicated master key is unavailable for new encryption", () => {
    delete process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptSecret("provider-secret")).toThrow("LUCY_CREDENTIALS_ENCRYPTION_KEY is not configured");
  });
});
