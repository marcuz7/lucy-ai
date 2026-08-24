import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { lucyLlmCredentials, lucySearchCredentials, lucyTelnyxCredentials, lucyTwilioCredentials } from "../../drizzle/schema";
import { resolveLlmSettings } from "../../shared/llm";

const algorithm = "aes-256-gcm";

function key() {
  return crypto.createHash("sha256").update(process.env.JWT_SECRET || "lucy-local-development-key").digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  const [ivText, tagText, encryptedText] = value.split(".");
  if (!ivText || !tagText || !encryptedText) throw new Error("Invalid encrypted Twilio credential");
  const decipher = crypto.createDecipheriv(algorithm, key(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
}

export function normalizeAllowedSenders(values: string[]) {
  return Array.from(new Set(values.flatMap(value => value.split(/[\s,]+/)).map(value => value.trim()).filter(Boolean))).filter(value => /^\+[1-9]\d{7,14}$/.test(value));
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

export async function testTwilioCredentials(ownerUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const rows = await db.select().from(lucyTwilioCredentials).where(eq(lucyTwilioCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "No Twilio credentials are saved yet." };
  const auth = Buffer.from(`${row.accountSid}:${decryptSecret(row.authTokenEncrypted)}`).toString("base64");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${row.accountSid}.json`, { headers: { Authorization: `Basic ${auth}` } });
  return response.ok ? { ok: true, message: "Twilio credentials are valid." } : { ok: false, message: "Twilio rejected these credentials." };
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: decryptSecret(row.apiKeyEncrypted), query: "LucyAi connection test", max_results: 1 }),
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

export async function getTwilioCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, accountSid: null, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, updatedAt: null };
  const rows = await db.select({ accountSid: lucyTwilioCredentials.accountSid, phoneNumber: lucyTwilioCredentials.phoneNumber, allowedSenders: lucyTwilioCredentials.allowedSenders, updatedAt: lucyTwilioCredentials.updatedAt }).from(lucyTwilioCredentials).where(eq(lucyTwilioCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  let allowedSenders: string[] = [];
  try { allowedSenders = row?.allowedSenders ? JSON.parse(row.allowedSenders) : []; } catch { allowedSenders = []; }
  return row ? { configured: true, accountSid: maskAccountSid(row.accountSid), phoneNumber: maskPhoneNumber(row.phoneNumber), allowedSenders: allowedSenders.map(maskPhoneNumber), allowedSendersCount: allowedSenders.length, updatedAt: row.updatedAt } : { configured: false, accountSid: null, phoneNumber: null, allowedSenders: [], allowedSendersCount: 0, updatedAt: null };
}
