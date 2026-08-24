import { count, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { lucyJobs, lucyMessages } from "../../drizzle/schema";
import { getRecentAgentRuns } from "./agentPersistence";

export async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return { queue: { pending: 0, processing: 0, completed: 0, deadLetter: 0 }, messages: [] };
  const [counts, messages] = await Promise.all([
    db.select({ status: lucyJobs.status, count: count() }).from(lucyJobs).groupBy(lucyJobs.status),
    db.select({ id: lucyMessages.id, channel: lucyMessages.channel, senderId: lucyMessages.senderId, chatId: lucyMessages.chatId, text: lucyMessages.text, mediaCount: lucyMessages.mediaCount, receivedAt: lucyMessages.receivedAt }).from(lucyMessages).orderBy(desc(lucyMessages.receivedAt)).limit(50),
  ]);
  const queue = { pending: 0, processing: 0, completed: 0, deadLetter: 0 };
  for (const row of counts) {
    const value = Number(row.count);
    if (row.status === "pending") queue.pending = value;
    if (row.status === "processing") queue.processing = value;
    if (row.status === "completed") queue.completed = value;
    if (row.status === "dead_letter") queue.deadLetter = value;
  }
  return { queue, messages };
}

export async function getAgentRuns() {
  return getRecentAgentRuns(50);
}

export async function getQueueJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: lucyJobs.id, messageId: lucyJobs.messageId, chatId: lucyJobs.chatId, status: lucyJobs.status, attempts: lucyJobs.attempts, lastError: lucyJobs.lastError, createdAt: lucyJobs.createdAt, completedAt: lucyJobs.completedAt }).from(lucyJobs).orderBy(desc(lucyJobs.createdAt)).limit(100);
}
