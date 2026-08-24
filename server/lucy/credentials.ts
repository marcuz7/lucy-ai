import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { lucyTwilioCredentials } from "../../drizzle/schema";

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

export async function saveTwilioCredentials(ownerUserId: number, input: { accountSid: string; authToken: string; phoneNumber: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  await db.insert(lucyTwilioCredentials).values({ ownerUserId, accountSid: input.accountSid.trim(), authTokenEncrypted: encryptSecret(input.authToken.trim()), phoneNumber: input.phoneNumber.trim() }).onDuplicateKeyUpdate({
    set: { accountSid: input.accountSid.trim(), authTokenEncrypted: encryptSecret(input.authToken.trim()), phoneNumber: input.phoneNumber.trim(), updatedAt: new Date() },
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

export async function getTwilioCredentialStatus(ownerUserId: number) {
  const db = await getDb();
  if (!db) return { configured: false, accountSid: null, phoneNumber: null, updatedAt: null };
  const rows = await db.select({ accountSid: lucyTwilioCredentials.accountSid, phoneNumber: lucyTwilioCredentials.phoneNumber, updatedAt: lucyTwilioCredentials.updatedAt }).from(lucyTwilioCredentials).where(eq(lucyTwilioCredentials.ownerUserId, ownerUserId)).limit(1);
  const row = rows[0];
  return row ? { configured: true, accountSid: maskAccountSid(row.accountSid), phoneNumber: maskPhoneNumber(row.phoneNumber), updatedAt: row.updatedAt } : { configured: false, accountSid: null, phoneNumber: null, updatedAt: null };
}
