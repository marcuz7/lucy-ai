import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { lucyAndroidGatewayCredentials, lucyLlmCredentials, lucyRedisCredentials, lucySearchCredentials, lucyTelnyxCredentials, lucyTwilioCredentials } from "../../drizzle/schema";
import { resolveLlmSettings } from "../../shared/llm";

const algorithm = "aes-256-gcm" as const;
const formatVersion = "v1";
const associatedData = Buffer.from("lucyai/provider-credential:v1", "utf8");

function decodeKey(encoded: string | undefined, name: string) {
  if (!encoded) throw new Error(`${name} is not configured`);
  const value = Buffer.from(encoded, "base64");
  if (value.length !== 32) throw new Error(`${name} must decode to exactly 32 bytes`);
  return value;
}

function dedicatedKey() {
  return decodeKey(process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY, "LUCY_CREDENTIALS_ENCRYPTION_KEY");
}

function previousDedicatedKey() {
  const encoded = process.env.LUCY_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS;
  return encoded ? decodeKey(encoded, "LUCY_CREDENTIALS_ENCRYPTION_KEY_PREVIOUS") : null;
}

function legacyKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured for legacy credential migration");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  if (!value) throw new Error("Cannot encrypt an empty credential");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, dedicatedKey(), iv);
  cipher.setAAD(associatedData);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${formatVersion}.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptVersioned(value: string, encryptionKey: Buffer) {
  const [version, ivText, tagText, encryptedText] = value.split(".");
  if (version !== formatVersion || !ivText || !tagText || !encryptedText) throw new Error("Invalid encrypted provider credential");
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const encrypted = Buffer.from(encryptedText, "base64url");
  if (iv.length !== 12 || tag.length !== 16 || !encrypted.length) throw new Error("Invalid encrypted provider credential");
  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
  decipher.setAAD(associatedData);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function decryptSecret(value: string) {
  const parts = value.split(".");
  if (parts[0] !== formatVersion) {
    const [ivText, tagText, encryptedText] = parts;
    if (!ivText || !tagText || !encryptedText) throw new Error("Invalid encrypted provider credential");
    const iv = Buffer.from(ivText, "base64url");
    const tag = Buffer.from(tagText, "base64url");
    const encrypted = Buffer.from(encryptedText, "base64url");
    if (iv.length !== 12 || tag.length !== 16 || !encrypted.length) throw new Error("Invalid encrypted provider credential");
    const decipher = crypto.createDecipheriv(algorithm, legacyKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }

  const activeKey = dedicatedKey();
  const previousKey = previousDedicatedKey();
  const keys = previousKey ? [activeKey, previousKey] : [activeKey];
  for (const encryptionKey of keys) {
    try {
      return decryptVersioned(value, encryptionKey);
    } catch {
      // Try the next configured key during a controlled rotation window.
    }
  }
  throw new Error("Unable to decrypt provider credential with the active key ring");
}

export function reEncryptSecret(value: string) {
  return encryptSecret(decryptSecret(value));
}

export function isE164PhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}

export function normalizeAllowedSenders(values: string[]) {
  return Array.from(new Set(values.flatMap(value => value.split(/[\s,]+/)).map(value => value.trim()).filter(Boolean))).filter(isE164PhoneNumber);
}

export async function saveTwilioCredentials(ownerUserId: number, input: { accountSid: string; authToken: string; phoneNumber: string; allowedSenders: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const allowedSenders = normalizeAllowedSenders(input.allowedSenders);
  if (!allowedSenders.length) throw new Error("Add at least one allowlisted sender number in E.164 format");
  await db.insert(lucyTwilioCredentials).values({ ownerUserId, accountSid: input.accountSid.trim(), authTokenEncrypted: encryptSecret(input.authToken.trim()), phoneNumber: input.phoneNumber.trim(), allowedSenders: JSON.stringify(allowedSenders) }).onDuplicateKeyUpdate({
    set: { accountSid: input.accountSid.trim(), authTokenEncrypted: encryptSecret(input.authToken.trim()), phoneNumber: input.phoneNumber.trim(), allowedSenders: JSON.stringify(allowedSenders), updatedAt: new Date() },
  });
}

export function maskPhoneNumber(value: string) {
  return value.length > 4 ? `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}` : "••••";
}

export function maskAccountSid(value: string) {
  return value.length > 6 ? `${value.slice(0, 2)}••••••${value.slice(-4)}` : "••••";
}

export function twilioCredentialFailureMessage(status: number) {
  if (status === 401 || status === 403) return "Twilio rejected the Account SID/Auth Token pair. Copy both values from Twilio Console and save them again.";
  if (status === 404) return "Twilio could not find this Account SID. Check that it is the Account SID from Twilio Console, not an API key or phone number.";
  if (status === 429) return "Twilio rate-limited the test. Wait briefly and try again.";
  if (status >= 500) return "Twilio is temporarily unavailable. Try the connection test again later.";
  return "Twilio rejected the connection test. Check the Account SID and Auth Token.";
}

export async function testTwilioCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucyTwilioCredentials).where(eq(lucyTwilioCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No Twilio credentials are saved yet." };
  const auth = Buffer.from(`${row.accountSid}:${decryptSecret(row.authTokenEncrypted)}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${row.accountSid}.json`, { headers: { Authorization: `Basic ${auth}` } });
  return response.ok ? { ok: true, message: "Twilio credentials are valid." } : { ok: false, message: twilioCredentialFailureMessage(response.status) };
}

export async function getTwilioCredentialsForWebhook() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lucyTwilioCredentials).orderBy(desc(lucyTwilioCredentials.updatedAt)).limit(1);
  const row = rows[0];
  let allowedSenders: string[] = [];
  try { allowedSenders = row?.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return row ? { accountSid: row.accountSid, authToken: decryptSecret(row.authTokenEncrypted), phoneNumber: row.phoneNumber, allowedSenders } : null;
}

export async function saveTelnyxCredentials(ownerUserId: number, input: { apiKey: string; publicKey: string; phoneNumber: string; allowedSenders: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const allowedSenders = normalizeAllowedSenders(input.allowedSenders);
  if (!allowedSenders.length) throw new Error("Add at least one allowlisted sender number in E.164 format");
  await db.insert(lucyTelnyxCredentials).values({ ownerUserId, apiKeyEncrypted: encryptSecret(input.apiKey.trim()), publicKey: input.publicKey.trim(), phoneNumber: input.phoneNumber.trim(), allowedSenders: JSON.stringify(allowedSenders) }).onDuplicateKeyUpdate({
    set: { apiKeyEncrypted: encryptSecret(input.apiKey.trim()), publicKey: input.publicKey.trim(), phoneNumber: input.phoneNumber.trim(), allowedSenders: JSON.stringify(allowedSenders), updatedAt: new Date() },
  });
}

export async function testTelnyxCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucyTelnyxCredentials).where(eq(lucyTelnyxCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No Telnyx credentials are saved yet." };
  const response = await fetch("https://api.telnyx.com/v2/messaging_profiles?page[size]=1", { headers: { Authorization: `Bearer ${decryptSecret(row.apiKeyEncrypted)}` } });
  return response.ok ? { ok: true, message: "Telnyx credentials are valid." } : { ok: false, message: "Telnyx rejected these credentials." };
}

export async function getTelnyxCredentialsForWebhook() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lucyTelnyxCredentials).orderBy(desc(lucyTelnyxCredentials.updatedAt)).limit(1);
  const row = rows[0];
  let allowedSenders: string[] = [];
  try { allowedSenders = row?.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return row ? { apiKey: decryptSecret(row.apiKeyEncrypted), publicKey: row.publicKey, phoneNumber: row.phoneNumber, allowedSenders } : null;
}

export async function getTelnyxCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, publicKeyConfigured: false, updatedAt: null };
  const rows = await db.select({ phoneNumber: lucyTelnyxCredentials.phoneNumber, publicKey: lucyTelnyxCredentials.publicKey, allowedSenders: lucyTelnyxCredentials.allowedSenders, updatedAt: lucyTelnyxCredentials.updatedAt }).from(lucyTelnyxCredentials).where(eq(lucyTelnyxCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  let allowedSenders: string[] = [];
  try { allowedSenders = row?.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return row ? { configured: true, phoneNumber: maskPhoneNumber(row.phoneNumber), allowedSenders: allowedSenders.map(maskPhoneNumber), allowedSendersCount: allowedSenders.length, publicKeyConfigured: Boolean(row.publicKey), updatedAt: row.updatedAt } : { configured: false, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, publicKeyConfigured: false, updatedAt: null };
}

export async function saveLlmCredentials(ownerUserId: number, input: { provider: string; apiKey: string; baseUrl: string; model: string }) {
  const resolved = resolveLlmSettings(input);
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const parsed = new URL(resolved.baseUrl);
  if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") throw new Error("BYO LLM base URL must use HTTPS");
  if (!resolved.apiKey || !resolved.model) throw new Error("LLM API key and model are required");
  await db.insert(lucyLlmCredentials).values({ ownerUserId, provider: resolved.provider, apiKeyEncrypted: encryptSecret(resolved.apiKey), baseUrl: resolved.baseUrl, model: resolved.model }).onDuplicateKeyUpdate({
    set: { provider: resolved.provider, apiKeyEncrypted: encryptSecret(resolved.apiKey), baseUrl: resolved.baseUrl, model: resolved.model, updatedAt: new Date() },
  });
}

export async function testLlmCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucyLlmCredentials).where(eq(lucyLlmCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No BYO LLM credentials are saved yet." };
  const apiKey = decryptSecret(row.apiKeyEncrypted);
  const resolved = resolveLlmSettings({ provider: row.provider, apiKey, baseUrl: row.baseUrl, model: row.model });
  const response = await fetch(`${resolved.baseUrl}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
  return response.ok ? { ok: true, message: `${resolved.provider === "groq" ? "Groq" : "BYO LLM"} endpoint is reachable.` } : { ok: false, message: `${resolved.provider === "groq" ? "Groq" : "BYO LLM"} rejected these credentials. Check the key and model.` };
}

export function summarizeLlmCredential(row: { provider: string; baseUrl: string; model: string; updatedAt: Date } | null) {
  return row ? { configured: true, provider: row.provider, baseUrl: row.baseUrl, model: row.model, apiKeyConfigured: true, updatedAt: row.updatedAt } : { configured: false, provider: null, baseUrl: null, model: null, apiKeyConfigured: false, updatedAt: null };
}

export async function getLlmCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return summarizeLlmCredential(null);
  const rows = await db.select({ provider: lucyLlmCredentials.provider, baseUrl: lucyLlmCredentials.baseUrl, model: lucyLlmCredentials.model, updatedAt: lucyLlmCredentials.updatedAt }).from(lucyLlmCredentials).where(eq(lucyLlmCredentials.ownerUserId, ownerUserId)).limit(1);
  return summarizeLlmCredential(rows[0] ?? null);
}

export async function getLlmCredentialsForAgent() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lucyLlmCredentials).orderBy(desc(lucyLlmCredentials.updatedAt)).limit(1);
  const row = rows[0];
  if (!row) return null;
  const apiKey = decryptSecret(row.apiKeyEncrypted);
  return resolveLlmSettings({ provider: row.provider, apiKey, baseUrl: row.baseUrl, model: row.model });
}

export async function saveTavilyCredentials(ownerUserId: number, apiKey: string) {
  const normalized = apiKey.trim();
  if (normalized.length < 8 || normalized.length > 512) throw new Error("Tavily API key is required");
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(lucySearchCredentials).values({ ownerUserId, provider: "tavily", apiKeyEncrypted: encryptSecret(normalized) }).onDuplicateKeyUpdate({
    set: { provider: "tavily", apiKeyEncrypted: encryptSecret(normalized), updatedAt: new Date() },
  });
}

export async function getTavilyCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, provider: null, updatedAt: null };
  const rows = await db.select({ provider: lucySearchCredentials.provider, updatedAt: lucySearchCredentials.updatedAt }).from(lucySearchCredentials).where(eq(lucySearchCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  return row ? { configured: true, provider: row.provider, updatedAt: row.updatedAt } : { configured: false, provider: null, updatedAt: null };
}

export async function testTavilyCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucySearchCredentials).where(eq(lucySearchCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No Tavily credentials are saved yet." };
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${decryptSecret(row.apiKeyEncrypted)}` },
    body: JSON.stringify({ query: "LucyAi connection test", max_results: 1 }),
  });
  return response.ok ? { ok: true, message: "Tavily search is reachable." } : { ok: false, message: "Tavily rejected this API key. Check the key and try again." };
}

export async function getTavilyApiKeyForAgent() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lucySearchCredentials).orderBy(desc(lucySearchCredentials.updatedAt)).limit(1);
  const row = rows[0];
  return row ? decryptSecret(row.apiKeyEncrypted) : null;
}

export function validateRedisUrl(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 1024) throw new Error("Redis URL is required");
  const parsed = new URL(normalized);
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") throw new Error("Redis URL must use redis:// or rediss://");
  return normalized;
}

export async function saveRedisCredentials(ownerUserId: number, redisUrl: string) {
  const normalized = validateRedisUrl(redisUrl);
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(lucyRedisCredentials).values({ ownerUserId, redisUrlEncrypted: encryptSecret(normalized) }).onDuplicateKeyUpdate({
    set: { redisUrlEncrypted: encryptSecret(normalized), updatedAt: new Date() },
  });
}

export async function getRedisCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, tls: false, updatedAt: null };
  const rows = await db.select({ redisUrlEncrypted: lucyRedisCredentials.redisUrlEncrypted, updatedAt: lucyRedisCredentials.updatedAt }).from(lucyRedisCredentials).where(eq(lucyRedisCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { configured: false, tls: false, updatedAt: null };
  const url = decryptSecret(row.redisUrlEncrypted);
  return { configured: true, tls: url.startsWith("rediss://"), updatedAt: row.updatedAt };
}

export async function testRedisCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucyRedisCredentials).where(eq(lucyRedisCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No Redis URL is saved yet." };
  const { createClient } = await import("redis");
  const client = createClient({ url: decryptSecret(row.redisUrlEncrypted) });
  try {
    await client.connect();
    await client.ping();
    return { ok: true, message: "Redis is reachable." };
  } catch {
    return { ok: false, message: "Redis could not be reached. Check the URL and network access." };
  } finally {
    if (client.isOpen) await client.quit().catch(() => undefined);
  }
}

export async function getRedisUrlForMemory() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lucyRedisCredentials).orderBy(desc(lucyRedisCredentials.updatedAt)).limit(1);
  const row = rows[0];
  return row ? decryptSecret(row.redisUrlEncrypted) : null;
}

export function validateAndroidGatewayUrl(value: string) {
  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized || normalized.length > 1024) throw new Error("Android gateway URL is required");
  const parsed = new URL(normalized);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Android gateway URL must use http:// or https://");
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("Android gateway URL must use HTTPS in production");
  return normalized;
}

function validateAndroidGatewaySecret(value: string, label: string) {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 512) throw new Error(`${label} is required`);
  return normalized;
}

export async function saveAndroidGatewayCredentials(ownerUserId: number, input: { apiUrl: string; username: string; password: string; webhookToken: string; phoneNumber: string; allowedSenders: string[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const apiUrl = validateAndroidGatewayUrl(input.apiUrl);
  const username = validateAndroidGatewaySecret(input.username, "Android gateway username");
  const password = validateAndroidGatewaySecret(input.password, "Android gateway password");
  const webhookToken = validateAndroidGatewaySecret(input.webhookToken, "Android gateway webhook token");
  if (!isE164PhoneNumber(input.phoneNumber)) throw new Error("Use E.164 format, for example +15551234567");
  const allowedSenders = normalizeAllowedSenders(input.allowedSenders);
  if (!allowedSenders.length) throw new Error("Add at least one allowlisted sender number in E.164 format");
  await db.insert(lucyAndroidGatewayCredentials).values({ ownerUserId, apiUrl, usernameEncrypted: encryptSecret(username), passwordEncrypted: encryptSecret(password), webhookTokenEncrypted: encryptSecret(webhookToken), phoneNumber: input.phoneNumber.trim(), allowedSenders: JSON.stringify(allowedSenders) }).onDuplicateKeyUpdate({
    set: { apiUrl, usernameEncrypted: encryptSecret(username), passwordEncrypted: encryptSecret(password), webhookTokenEncrypted: encryptSecret(webhookToken), phoneNumber: input.phoneNumber.trim(), allowedSenders: JSON.stringify(allowedSenders), updatedAt: new Date() },
  });
}

export async function getAndroidGatewayCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, apiHost: null, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, updatedAt: null };
  const rows = await db.select({ apiUrl: lucyAndroidGatewayCredentials.apiUrl, phoneNumber: lucyAndroidGatewayCredentials.phoneNumber, allowedSenders: lucyAndroidGatewayCredentials.allowedSenders, updatedAt: lucyAndroidGatewayCredentials.updatedAt }).from(lucyAndroidGatewayCredentials).where(eq(lucyAndroidGatewayCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { configured: false, apiHost: null, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, updatedAt: null };
  let allowedSenders: string[] = [];
  try { allowedSenders = row.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return { configured: true, apiHost: new URL(row.apiUrl).host, phoneNumber: maskPhoneNumber(row.phoneNumber), allowedSenders: allowedSenders.map(maskPhoneNumber), allowedSendersCount: allowedSenders.length, updatedAt: row.updatedAt };
}

export async function getAndroidGatewayCredentialsForRuntime() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(lucyAndroidGatewayCredentials).orderBy(desc(lucyAndroidGatewayCredentials.updatedAt)).limit(1);
  const row = rows[0];
  if (!row) return null;
  let allowedSenders: string[] = [];
  try { allowedSenders = row.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return { apiUrl: row.apiUrl, username: decryptSecret(row.usernameEncrypted), password: decryptSecret(row.passwordEncrypted), webhookToken: decryptSecret(row.webhookTokenEncrypted), phoneNumber: row.phoneNumber, allowedSenders };
}

export async function testAndroidGatewayCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucyAndroidGatewayCredentials).where(eq(lucyAndroidGatewayCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No Android gateway settings are saved yet." };
  const auth = Buffer.from(`${decryptSecret(row.usernameEncrypted)}:${decryptSecret(row.passwordEncrypted)}`).toString("base64");
  try {
    const response = await fetch(`${row.apiUrl}/docs`, { headers: { Authorization: `Basic ${auth}` } });
    if (!response.ok) return { ok: false, message: `Android gateway returned HTTP ${response.status}. Check the gateway credentials and endpoint.` };
    return { ok: true, message: "Android gateway endpoint is reachable." };
  } catch {
    return { ok: false, message: "Android gateway could not be reached. Check the URL, device network, and tunnel." };
  }
}

export async function getPublicTwilioLaunchNumber() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ phoneNumber: lucyTwilioCredentials.phoneNumber }).from(lucyTwilioCredentials).orderBy(desc(lucyTwilioCredentials.updatedAt)).limit(1);
  return rows[0]?.phoneNumber ?? null;
}

export async function getTwilioCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, accountSid: null, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, updatedAt: null };
  const rows = await db.select({ accountSid: lucyTwilioCredentials.accountSid, phoneNumber: lucyTwilioCredentials.phoneNumber, allowedSenders: lucyTwilioCredentials.allowedSenders, updatedAt: lucyTwilioCredentials.updatedAt }).from(lucyTwilioCredentials).where(eq(lucyTwilioCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  let allowedSenders: string[] = [];
  try { allowedSenders = row?.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return row ? { configured: true, accountSid: maskAccountSid(row.accountSid), phoneNumber: maskPhoneNumber(row.phoneNumber), allowedSenders: allowedSenders.map(maskPhoneNumber), allowedSendersCount: allowedSenders.length, updatedAt: row.updatedAt } : { configured: false, accountSid: null, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, updatedAt: null };
}
