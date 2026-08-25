import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { enqueueMessage } from "./queue";
import { memoryStore } from "./memory";
import type { ChannelAdapter, InboundMessage } from "./types";
import { getAndroidGatewayCredentialsForRuntime } from "./credentials";

const seenMessageIds = new Set<string>();
const hourlyCounts = new Map<string, { startedAt: number; count: number }>();
const OPT_OUT = /^(stop|cancel|unsubscribe|end|quit|arret)$/i;
const OPT_IN = /^(start|unstop|yes)$/i;
const HELP = /^(help|info)$/i;
const limitPerHour = 30;

function sameToken(actual: string, expected: string) {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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

class AndroidGatewayAdapter implements ChannelAdapter {
  async sendText(recipientId: string, text: string) {
    const stored = await getAndroidGatewayCredentialsForRuntime();
    if (!stored) {
      console.info(`[Lucy stub] Android gateway outbound to ${recipientId}: ${text}`);
      return {};
    }
    const auth = Buffer.from(`${stored.username}:${stored.password}`).toString("base64");
    const response = await fetch(`${stored.apiUrl}/message`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ textMessage: { text }, phoneNumbers: [recipientId] }),
    });
    if (!response.ok) throw new Error(`Android gateway outbound failed: ${response.status}`);
    const result = await response.json().catch(() => null) as { id?: string; messageId?: string } | null;
    return { providerMessageId: result?.id ?? result?.messageId };
  }
}

function xmlEscape(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" }[character] ?? character));
}

export function registerAndroidGatewayWebhook(app: Express) {
  app.post("/api/webhooks/android-gateway/incoming", async (req: Request, res: Response) => {
    const stored = await getAndroidGatewayCredentialsForRuntime();
    const configuredToken = stored?.webhookToken ?? process.env.ANDROID_GATEWAY_WEBHOOK_TOKEN;
    const suppliedToken = String(req.query.token ?? req.get("X-Lucy-Gateway-Token") ?? "");
    if (configuredToken && !sameToken(suppliedToken, configuredToken)) {
      res.status(403).type("text/plain").send("Invalid Android gateway webhook token");
      return;
    }

    const event = String(req.body?.event ?? "");
    const payload = req.body?.payload ?? {};
    if (event !== "sms:received") {
      res.status(204).send();
      return;
    }
    const senderId = String(payload.phoneNumber ?? "").trim();
    const text = String(payload.message ?? "").trim();
    const messageId = String(payload.messageId ?? `${senderId}:${Date.now()}`);
    const chatId = senderId;

    if (OPT_OUT.test(text)) {
      void memoryStore.optOut(senderId);
      res.status(200).json({ ok: true, action: "opted_out" });
      return;
    }
    if (OPT_IN.test(text)) {
      void memoryStore.optIn(senderId);
      res.status(200).json({ ok: true, action: "opted_in" });
      return;
    }
    if (HELP.test(text)) {
      res.status(200).json({ ok: true, action: "help" });
      return;
    }
    if (!senderId || !text) {
      res.status(400).json({ ok: false, message: "Missing sender or message" });
      return;
    }
    const configuredSenders = stored?.allowedSenders ?? String(process.env.LUCY_ALLOWED_SENDERS ?? "").split(/[\s,]+/).map(value => value.trim()).filter(Boolean);
    if (configuredToken && !configuredSenders.includes(senderId)) {
      res.status(403).json({ ok: false, message: "Sender is not allowlisted" });
      return;
    }
    if (seenMessageIds.has(messageId)) {
      res.status(200).json({ ok: true, duplicate: true });
      return;
    }
    seenMessageIds.add(messageId);
    if (!withinRateLimit(senderId)) {
      res.status(429).json({ ok: false, message: "Rate limit reached" });
      return;
    }

    const timestamp = Date.parse(String(payload.receivedAt ?? ""));
    const message: InboundMessage = {
      id: messageId,
      channel: "android-sms",
      senderId,
      chatId,
      text,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      media: [],
    };
    void enqueueMessage(message, new AndroidGatewayAdapter()).catch((error: unknown) => console.error("[Lucy Android gateway pipeline]", error));
    res.status(202).json({ ok: true, queued: true });
  });
}

export const androidGatewayXmlEscape = xmlEscape;
