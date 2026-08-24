import twilio from "twilio";
import type { Express, Request, Response } from "express";
import { enqueueMessage } from "./queue";
import { memoryStore } from "./memory";
import type { ChannelAdapter, InboundMessage } from "./types";
import { getTwilioCredentialsForWebhook } from "./credentials";

const seenMessageIds = new Set<string>();
const hourlyCounts = new Map<string, { startedAt: number; count: number }>();
const OPT_OUT = /^(stop|cancel|unsubscribe|end|quit|arret)$/i;
const OPT_IN = /^(start|unstop|yes)$/i;
const HELP = /^(help|info)$/i;
const limitPerHour = 30;

const xml = (text: string) => `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text.replace(/[<>&'\"]/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '\"': "&quot;" }[character] ?? character))}</Message></Response>`;

class TwilioAdapter implements ChannelAdapter {
  async sendText(recipientId: string, text: string) {
    const stored = await getTwilioCredentialsForWebhook();
    const sid = stored?.accountSid ?? process.env.TWILIO_ACCOUNT_SID;
    const token = stored?.authToken ?? process.env.TWILIO_AUTH_TOKEN;
    const from = stored?.phoneNumber ?? process.env.TWILIO_PHONE_NUMBER;
    if (!sid || !token || !from) {
      console.info(`[Lucy stub] outbound to ${recipientId}: ${text}`);
      return {};
    }
    const body = new URLSearchParams({ To: recipientId, From: from, Body: text });
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!response.ok) throw new Error(`Twilio outbound failed: ${response.status}`);
    const result = await response.json() as { sid?: string };
    return { providerMessageId: result.sid };
  }
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

export function registerTwilioWebhook(app: Express) {
  app.post("/api/webhooks/twilio/incoming", async (req: Request, res: Response) => {
    const stored = await getTwilioCredentialsForWebhook();
    const authToken = stored?.authToken ?? process.env.TWILIO_AUTH_TOKEN;
    const signature = req.get("X-Twilio-Signature");
    if (authToken) {
      const forwardedProto = String(req.get("x-forwarded-proto") ?? req.protocol).split(",")[0].trim();
      const forwardedHost = String(req.get("x-forwarded-host") ?? req.get("host") ?? "");
      const webhookUrl = `${forwardedProto}://${forwardedHost}${req.originalUrl}`;
      if (!signature || !twilio.validateRequest(authToken, signature, webhookUrl, req.body ?? {})) {
        res.status(403).type("text/plain").send("Invalid Twilio signature");
        return;
      }
    }

    const senderId = String(req.body?.From ?? "");
    const text = String(req.body?.Body ?? "").trim();
    const messageId = String(req.body?.MessageSid ?? `${senderId}:${Date.now()}`);
    const chatId = String(req.body?.ConversationSid ?? senderId);

    // Twilio needs a fast response. Compliance commands are handled before AI.

    if (OPT_OUT.test(text)) {
      void memoryStore.optOut(senderId);
      res.type("text/xml").send(xml("You’re unsubscribed. Reply START to opt back in."));
      return;
    }
    if (OPT_IN.test(text)) {
      void memoryStore.optIn(senderId);
      res.type("text/xml").send(xml("You’re opted back in. Lucy is ready when you are."));
      return;
    }
    if (HELP.test(text)) {
      res.type("text/xml").send(xml("Lucy help: text a question or ask Lucy to plan, find, draft, or create something. Reply STOP to opt out."));
      return;
    }
    if (!senderId || !text) {
      res.type("text/xml").send(xml("Lucy could not read that message."));
      return;
    }
    const configuredSenders = stored?.allowedSenders ?? String(process.env.LUCY_ALLOWED_SENDERS ?? "").split(/[\s,]+/).map(value => value.trim()).filter(Boolean);
    if (authToken && !configuredSenders.includes(senderId)) {
      res.type("text/xml").send(xml("This Lucy number is not enabled for this sender."));
      return;
    }
    if (seenMessageIds.has(messageId)) {
      res.type("text/xml").send("");
      return;
    }
    seenMessageIds.add(messageId);
    if (!withinRateLimit(senderId)) {
      res.type("text/xml").send(xml("Lucy is taking a short break for this number. Try again later."));
      return;
    }

    const mediaCount = Number(req.body?.NumMedia ?? 0);
    const media = Array.from({ length: Number.isFinite(mediaCount) ? mediaCount : 0 }, (_, index) => ({
      url: String(req.body?.[`MediaUrl${index}`] ?? ""),
      contentType: String(req.body?.[`MediaContentType${index}`] ?? "") || undefined,
    })).filter(item => item.url);
    const message: InboundMessage = { id: messageId, channel: "twilio-sms", senderId, chatId, text, timestamp: Date.now(), media };
    void enqueueMessage(message, new TwilioAdapter()).catch((error: unknown) => console.error("[Lucy pipeline]", error));
    res.type("text/xml").send("");
  });
}
