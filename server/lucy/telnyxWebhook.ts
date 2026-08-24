import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { enqueueMessage } from "./queue";
import { memoryStore } from "./memory";
import { getTelnyxCredentialsForWebhook } from "./credentials";
import type { ChannelAdapter, InboundMessage } from "./types";

type RawRequest = Request & { rawBody?: Buffer };
const seenMessageIds = new Set<string>();
const hourlyCounts = new Map<string, { startedAt: number; count: number }>();
const OPT_OUT = /^(stop|cancel|unsubscribe|end|quit|arret)$/i;
const OPT_IN = /^(start|unstop|yes)$/i;
const HELP = /^(help|info)$/i;
const limitPerHour = 30;

function configuredSenders(stored: Awaited<ReturnType<typeof getTelnyxCredentialsForWebhook>>) {
  return stored?.allowedSenders ?? String(process.env.LUCY_TELNYX_ALLOWED_SENDERS ?? "").split(/[\s,]+/).map(value => value.trim()).filter(Boolean);
}

function withinRateLimit(senderId: string) {
  const now = Date.now();
  const current = hourlyCounts.get(senderId);
  if (!current || now - current.startedAt >= 60 * 60 * 1000) {
    hourlyCounts.set(senderId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limitPerHour) return false;
  current.count += 1;
  return true;
}

function publicKeyObject(publicKey: string) {
  if (publicKey.includes("BEGIN")) return crypto.createPublicKey(publicKey);
  return crypto.createPublicKey({ key: Buffer.from(publicKey, "base64"), format: "der", type: "spki" });
}

export function verifyTelnyxSignature(req: RawRequest, publicKey: string) {
  const signature = req.get("telnyx-signature-ed25519");
  const timestamp = req.get("telnyx-timestamp");
  const rawBody = req.rawBody;
  if (!signature || !timestamp || !rawBody || !publicKey) return false;
  try {
    return crypto.verify(null, Buffer.from(`${timestamp}|${rawBody.toString("utf8")}`), publicKeyObject(publicKey), Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export class TelnyxAdapter implements ChannelAdapter {
  async sendText(recipientId: string, text: string) {
    const stored = await getTelnyxCredentialsForWebhook();
    const apiKey = stored?.apiKey ?? process.env.TELNYX_API_KEY;
    const from = stored?.phoneNumber ?? process.env.TELNYX_PHONE_NUMBER ?? process.env.TELNYX_NUMBER;
    if (!apiKey || !from) {
      console.info(`[Lucy stub] Telnyx outbound to ${recipientId}: ${text}`);
      return {};
    }
    const response = await fetch("https://api.telnyx.com/v2/messages", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: recipientId, text }) });
    if (!response.ok) throw new Error(`Telnyx outbound failed: ${response.status}`);
    const result = await response.json() as { data?: { id?: string } };
    return { providerMessageId: result.data?.id };
  }
}

export function registerTelnyxWebhook(app: Express) {
  app.post("/api/webhooks/telnyx/incoming", async (req: RawRequest, res: Response) => {
    const stored = await getTelnyxCredentialsForWebhook();
    const apiKey = stored?.apiKey ?? process.env.TELNYX_API_KEY;
    const publicKey = stored?.publicKey ?? process.env.TELNYX_PUBLIC_KEY;
    if (apiKey && (!publicKey || !verifyTelnyxSignature(req, publicKey))) {
      res.status(403).type("text/plain").send("Invalid Telnyx signature");
      return;
    }

    const event = req.body?.data;
    if (event?.event_type !== "message.received") {
      res.sendStatus(200);
      return;
    }
    const payload = event.payload ?? {};
    const senderId = String(payload.from?.phone_number ?? "");
    const text = String(payload.text ?? "").trim();
    const messageId = String(payload.id ?? event.id ?? `${senderId}:${Date.now()}`);
    const chatId = String(payload.conversation_id ?? senderId);
    const adapter = new TelnyxAdapter();

    if (OPT_OUT.test(text)) {
      void memoryStore.optOut(senderId);
      void adapter.sendText(senderId, "You’re unsubscribed. Reply START to opt back in.").catch(error => console.error("[Lucy Telnyx compliance]", error));
      res.sendStatus(200);
      return;
    }
    if (OPT_IN.test(text)) {
      void memoryStore.optIn(senderId);
      void adapter.sendText(senderId, "You’re opted back in. Lucy is ready when you are.").catch(error => console.error("[Lucy Telnyx compliance]", error));
      res.sendStatus(200);
      return;
    }
    if (HELP.test(text)) {
      void adapter.sendText(senderId, "Lucy help: text a question or ask Lucy to find something. Reply STOP to opt out.").catch(error => console.error("[Lucy Telnyx compliance]", error));
      res.sendStatus(200);
      return;
    }
    if (!senderId || !text) {
      res.sendStatus(200);
      return;
    }
    if (apiKey && !configuredSenders(stored).includes(senderId)) {
      void adapter.sendText(senderId, "This Lucy number is not enabled for this sender.").catch(error => console.error("[Lucy Telnyx allowlist]", error));
      res.sendStatus(200);
      return;
    }
    if (seenMessageIds.has(messageId)) {
      res.sendStatus(200);
      return;
    }
    seenMessageIds.add(messageId);
    if (!withinRateLimit(senderId)) {
      void adapter.sendText(senderId, "Lucy is taking a short break for this number. Try again later.").catch(error => console.error("[Lucy Telnyx rate-limit]", error));
      res.sendStatus(200);
      return;
    }

    const media: Array<{ url: string; contentType?: string }> = Array.isArray(payload.media) ? (payload.media as Array<{ url?: string; content_type?: string }>).map(item => ({ url: String(item.url ?? ""), contentType: item.content_type })).filter((item: { url: string; contentType?: string }) => item.url.length > 0) : [];
    const message: InboundMessage = { id: messageId, channel: "telnyx-sms", senderId, chatId, text, timestamp: Date.now(), media };
    void enqueueMessage(message, adapter).catch(error => console.error("[Lucy Telnyx pipeline]", error));
    res.sendStatus(200);
  });
}
