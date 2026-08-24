import { desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../db";
import { lucyAgentApprovals, lucyAgentRuns, lucyAgentToolCalls, lucyConversationEvents, lucyJobs, lucyMessages } from "../../drizzle/schema";

export async function recordConversationEvent(event: { chatId: string; messageId?: string; role: "user" | "assistant" | "system"; text: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(lucyConversationEvents).values({ id: randomUUID(), chatId: event.chatId, messageId: event.messageId, role: event.role, text: event.text });
}

export async function getMessageDetail(messageId: string) {
  const db = await getDb();
  if (!db) return null;
  const [messageRows, jobRows, agentRows] = await Promise.all([
    db.select().from(lucyMessages).where(eq(lucyMessages.id, messageId)).limit(1),
    db.select({ id: lucyJobs.id, status: lucyJobs.status, attempts: lucyJobs.attempts, lastError: lucyJobs.lastError, createdAt: lucyJobs.createdAt, startedAt: lucyJobs.startedAt, completedAt: lucyJobs.completedAt }).from(lucyJobs).where(eq(lucyJobs.messageId, messageId)).limit(10),
    db.select().from(lucyAgentRuns).where(eq(lucyAgentRuns.messageId, messageId)).limit(1),
  ]);
  const message = messageRows[0];
  if (!message) return null;
  const events = await db.select({ id: lucyConversationEvents.id, role: lucyConversationEvents.role, text: lucyConversationEvents.text, messageId: lucyConversationEvents.messageId, createdAt: lucyConversationEvents.createdAt }).from(lucyConversationEvents).where(eq(lucyConversationEvents.chatId, message.chatId)).orderBy(desc(lucyConversationEvents.createdAt)).limit(100);
  const agentRun = agentRows[0];
  const agent = agentRun ? {
    run: agentRun,
    toolCalls: await db.select({ id: lucyAgentToolCalls.id, sequence: lucyAgentToolCalls.sequence, toolName: lucyAgentToolCalls.toolName, status: lucyAgentToolCalls.status, output: lucyAgentToolCalls.output, error: lucyAgentToolCalls.error, startedAt: lucyAgentToolCalls.startedAt, completedAt: lucyAgentToolCalls.completedAt }).from(lucyAgentToolCalls).where(eq(lucyAgentToolCalls.runId, agentRun.id)).orderBy(lucyAgentToolCalls.sequence),
    approvals: await db.select({ id: lucyAgentApprovals.id, action: lucyAgentApprovals.action, status: lucyAgentApprovals.status, requestedAt: lucyAgentApprovals.requestedAt, respondedAt: lucyAgentApprovals.respondedAt, expiresAt: lucyAgentApprovals.expiresAt }).from(lucyAgentApprovals).where(eq(lucyAgentApprovals.runId, agentRun.id)),
  } : null;
  let media: Array<{ url: string; contentType: string }> = [];
  try { media = message.mediaJson ? JSON.parse(message.mediaJson) : []; } catch { media = []; }
  return { message: { ...message, media }, events: events.reverse(), jobs: jobRows, agent };
}
