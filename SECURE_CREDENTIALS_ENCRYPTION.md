# LucyAi provider-credential encryption

The current helper in `server/lucy/credentials.ts` derives its encryption key from `JWT_SECRET`. For production, replace that derivation with a dedicated `LUCY_CREDENTIALS_ENCRYPTION_KEY` that is stored only in the platform secret manager.

## 1. Dedicated master key and authenticated encryption

```ts
// server/lucy/secretCrypto.ts
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm" as const;
const FORMAT_VERSION = "v1";
const AAD = Buffer.from("lucyai/provider-credential:v1", "utf8");

function getMasterKey(): Buffer {
  const encoded = process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("LUCY_CREDENTIALS_ENCRYPTION_KEY is not configured");
  }

  // Generate the value with: openssl rand -base64 32
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("LUCY_CREDENTIALS_ENCRYPTION_KEY must decode to exactly 32 bytes");
  }
  return key;
}

function decodePart(value: string, name: string): Buffer {
  try {
    const decoded = Buffer.from(value, "base64url");
    if (!decoded.length) throw new Error("empty value");
    return decoded;
  } catch {
    throw new Error(`Invalid encrypted credential ${name}`);
  }
}

export function encryptSecret(plaintext: string): string {
  if (!plaintext) throw new Error("Cannot encrypt an empty credential");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);
  cipher.setAAD(AAD);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Store only version, IV, authentication tag, and ciphertext.
  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(serialized: string): string {
  const [version, ivText, tagText, ciphertextText] = serialized.split(".");
  if (version !== FORMAT_VERSION || !ivText || !tagText || !ciphertextText) {
    throw new Error("Invalid encrypted credential format");
  }

  const iv = decodePart(ivText, "IV");
  const tag = decodePart(tagText, "authentication tag");
  const ciphertext = decodePart(ciphertextText, "ciphertext");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid encrypted credential dimensions");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);

  // GCM authentication fails here if the ciphertext, tag, or AAD was changed.
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
```

## 2. Use it only on the server

```ts
// server/lucy/credentials.ts
import { encryptSecret, decryptSecret } from "./secretCrypto";

await db.insert(lucyTelnyxCredentials).values({
  ownerUserId,
  apiKeyEncrypted: encryptSecret(input.apiKey.trim()),
  publicKey: input.publicKey.trim(),
  phoneNumber: input.phoneNumber.trim(),
  allowedSenders: JSON.stringify(allowedSenders),
});

const telnyxKey = decryptSecret(row.apiKeyEncrypted);
// Use telnyxKey immediately for the provider request; never return it.
```

The same pattern applies to Twilio Auth Tokens, Groq/OpenAI-compatible keys, and Tavily keys. The client receives only metadata such as `{ configured: true, provider: "groq" }`; it never receives the decrypted value.

## 3. Production secret-manager value

Create one random 32-byte key and store its base64 value as `LUCY_CREDENTIALS_ENCRYPTION_KEY`. For example:

```bash
openssl rand -base64 32
```

Do not paste the resulting value into source code, a `VITE_*` variable, the database, logs, analytics, or chat. Keep `JWT_SECRET` for session signing only. In development, configure the same variable through the project secret manager rather than adding a fallback in production.

## 4. Key rotation

Use versioned ciphertext for rotation. During a rotation window, keep the old key available under a separate key version, decrypt each record with its recorded version, re-encrypt it with the new key, update the version, verify the record, and only then revoke the old key. Never rotate by changing the master key without re-encrypting existing rows, because the ciphertext is not recoverable without the original key.

## 5. Required safeguards

Decryption must remain server-only and must occur inside the provider adapter or connection test. Redact request bodies, authorization headers, thrown errors, audit payloads, and provider responses before logging. Use HTTPS, HttpOnly and Secure session cookies, owner-scoped authorization, and fail closed when `LUCY_CREDENTIALS_ENCRYPTION_KEY` is absent or malformed.
