import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { lucyMessages } from "../../drizzle/schema";
import { getDb } from "../db";
import type { ChannelAdapter, InboundMessage } from "./types";
import { processInbound } from "./pipeline";

let pool: mysql.Pool | null = null;
let draining: Promise<void> | null = null;
const activeChats = new Set<string>();

function getPool() {
  if (!pool && process.env.DATABASE_URL) pool = mysql.createPool(process.env.DATABASE_URL);
  return pool;
}

export async function enqueueMessage(message: InboundMessage, adapter: ChannelAdapter) {
  const db = getPool();
  if (!db) {
    // Local stub mode only. Production uses the durable table below.
    await processInbound(message, adapter);
    return;
  }
  const drizzleDb = await getDb();
  if (drizzleDb) {
    await drizzleDb.insert(lucyMessages).values({ id: message.id, channel: message.channel, senderId: message.senderId, chatId: message.chatId, text: message.text, mediaCount: message.media.length }).onDuplicateKeyUpdate({ set: { text: message.text } });
  }
  await db.execute(
    "INSERT INTO lucy_jobs (id, message_id, chat_id, payload, status, attempts, available_at) VALUES (?, ?, ?, ?, 'pending', 0, NOW())",
    [randomUUID(), message.id, message.chatId, JSON.stringify(message)],
  );
  void drainQueue(adapter).catch(error => console.error("[Lucy queue]", error));
}

export async function drainQueue(adapter: ChannelAdapter) {
  if (draining) return draining;
  const db = getPool();
  if (!db) return;
  draining = (async () => {
    while (true) {
      const connection = await db.getConnection();
      let selected: mysql.RowDataPacket[] = [];
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query<mysql.RowDataPacket[]>(
          "SELECT id, chat_id, payload FROM lucy_jobs WHERE status = 'pending' AND available_at <= NOW() ORDER BY created_at ASC LIMIT 25 FOR UPDATE SKIP LOCKED",
        );
        const byChat = new Set<string>();
        selected = rows.filter(row => {
          const chatId = String(row.chat_id);
          if (activeChats.has(chatId) || byChat.has(chatId)) return false;
          byChat.add(chatId);
          return true;
        });
        if (!selected.length) {
          await connection.rollback();
          break;
        }
        for (const row of selected) {
          await connection.execute("UPDATE lucy_jobs SET status = 'processing', attempts = attempts + 1, started_at = NOW() WHERE id = ?", [row.id]);
          activeChats.add(String(row.chat_id));
        }
        await connection.commit();
      } finally {
        connection.release();
      }

      await Promise.all(selected.map(async row => {
        const chatId = String(row.chat_id);
        try {
          await processInbound(JSON.parse(String(row.payload)) as InboundMessage, adapter);
          await db.execute("UPDATE lucy_jobs SET status = 'completed', completed_at = NOW() WHERE id = ?", [row.id]);
        } catch (error) {
          await db.execute("UPDATE lucy_jobs SET status = IF(attempts >= 3, 'dead_letter', 'pending'), available_at = DATE_ADD(NOW(), INTERVAL attempts * 10 SECOND), last_error = ? WHERE id = ?", [String(error), row.id]);
        } finally {
          activeChats.delete(chatId);
        }
      }));
    }
  })().finally(() => { draining = null; });
  return draining;
}
