import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { lucyConversationEvents, lucyJobs, lucyMessages } from "../../drizzle/schema";

export async function recordConversationEvent(event: { chatId: string; messageId?: string; role: "user" | "assistant" | "system"; text: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lucyConversationEvents).values({ id: randomUUID(), chatId: event.chatId, messageId: event.messageId, role: event.role, text: event.text });
}

export async function getMessageDetail(messageId: string) {
  const db = await getDb();
  if (!db) return null;
  const [messageRows, jobRows] = await Promise.all([
    db.select().from(lucyMessages).where(eq(lucyMessages.id, messageId)).limit(1),
    db.select({ id: lucyJobs.id, status: lucyJobs.status, attempts: lucyJobs.attempts, lastError: lucyJobs.lastError, createdAt: lucyJobs.createdAt, startedAt: lucyJobs.startedAt, completedAt: lucyJobs.completedAt }).from(lucyJobs).where(eq(lucyJobs.messageId, messageId)).limit(10),
  ]);
  const message = messageRows[0];
  if (!message) return null;
  const events = await db.select({ id: lucyConversationEvents.id, role: lucyConversationEvents.role, text: lucyConversationEvents.text, messageId: lucyConversationEvents.messageId, createdAt: lucyConversationEvents.createdAt }).from(lucyConversationEvents).where(eq(lucyConversationEvents.chatId, message.chatId)).orderBy(desc(lucyConversationEvents.createdAt)).limit(100);
  return { message, events: events.reverse(), jobs: jobRows };
}
