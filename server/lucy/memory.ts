import { createClient, type RedisClientType } from "redis";
import { getRedisUrlForMemory } from "./credentials";
import type { InboundMessage, MemorySnapshot, MemoryStore, MemoryTurn, SpeakDecision } from "./types";

export const SHORT_TERM_MEMORY_TTL_SECONDS = 86_400;
export const SHORT_TERM_MEMORY_TURN_LIMIT = 20;
export const WORKING_MEMORY_TURN_LIMIT = 12;

export function trimShortTermHistory(turns: MemoryTurn[]): MemoryTurn[] {
  return turns.slice(-SHORT_TERM_MEMORY_TURN_LIMIT);
}

const working = new Map<string, MemoryTurn[]>();
const history = new Map<string, MemoryTurn[]>();
const facts = new Map<string, Record<string, string>>();
const optedOut = new Set<string>();
const decisions = new Map<string, SpeakDecision>();

export class InMemoryMemoryStore implements MemoryStore {
  async saveInbound(message: InboundMessage) {
    await this.appendTurn(message.chatId, { role: "user", text: message.text, timestamp: message.timestamp });
  }

  async saveDecision(messageId: string, decision: SpeakDecision) {
    decisions.set(messageId, decision);
  }

  async appendTurn(conversationId: string, turn: MemoryTurn) {
    const recent = working.get(conversationId) ?? [];
    const all = history.get(conversationId) ?? [];
    recent.push(turn);
    all.push(turn);
    working.set(conversationId, recent.slice(-WORKING_MEMORY_TURN_LIMIT));
    history.set(conversationId, all.slice(-200));
  }

  async snapshot(conversationId: string): Promise<MemorySnapshot> {
    const recent = working.get(conversationId) ?? [];
    const all = history.get(conversationId) ?? [];
    return { working: recent, facts: facts.get(conversationId) ?? {}, retrieved: all.slice(-30, -WORKING_MEMORY_TURN_LIMIT) };
  }

  async isOptedOut(senderId: string) {
    return optedOut.has(senderId);
  }

  async optOut(senderId: string) {
    optedOut.add(senderId);
  }

  async optIn(senderId: string) {
    optedOut.delete(senderId);
  }
}

type RedisClient = RedisClientType;

let redisPromise: Promise<RedisClient | null> | null = null;

async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim() || await getRedisUrlForMemory();
  if (!url) return null;
  if (!redisPromise) {
    const client = createClient({ url });
    client.on("error", error => console.warn("[Lucy memory] Redis error; using fallback when needed:", error));
    redisPromise = client.connect().then(() => client).catch(error => {
      console.warn("[Lucy memory] Redis unavailable; using in-process fallback:", error);
      redisPromise = null;
      return null;
    });
  }
  return redisPromise;
}

function key(conversationId: string, suffix: "working" | "history") {
  return `lucy:memory:${conversationId}:${suffix}`;
}

function parseTurns(raw: string | null): MemoryTurn[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as MemoryTurn[] : [];
  } catch {
    return [];
  }
}

export class RedisMemoryStore implements MemoryStore {
  private readonly fallback = new InMemoryMemoryStore();

  async saveInbound(message: InboundMessage) {
    await this.appendTurn(message.chatId, { role: "user", text: message.text, timestamp: message.timestamp });
  }

  async saveDecision(messageId: string, decision: SpeakDecision) {
    decisions.set(messageId, decision);
  }

  async appendTurn(conversationId: string, turn: MemoryTurn) {
    const client = await getRedisClient();
    if (!client) {
      await this.fallback.appendTurn(conversationId, turn);
      return;
    }
    try {
      const [workingRaw, historyRaw] = await client.mGet([key(conversationId, "working"), key(conversationId, "history")]);
      const nextWorking = [...parseTurns(workingRaw), turn].slice(-WORKING_MEMORY_TURN_LIMIT);
      const nextHistory = trimShortTermHistory([...parseTurns(historyRaw), turn]);
      await client.multi()
        .setEx(key(conversationId, "working"), SHORT_TERM_MEMORY_TTL_SECONDS, JSON.stringify(nextWorking))
        .setEx(key(conversationId, "history"), SHORT_TERM_MEMORY_TTL_SECONDS, JSON.stringify(nextHistory))
        .exec();
    } catch (error) {
      console.warn("[Lucy memory] Redis write failed; using in-process fallback:", error);
      await this.fallback.appendTurn(conversationId, turn);
    }
  }

  async snapshot(conversationId: string): Promise<MemorySnapshot> {
    const client = await getRedisClient();
    if (!client) return this.fallback.snapshot(conversationId);
    try {
      const [workingRaw, historyRaw] = await client.mGet([key(conversationId, "working"), key(conversationId, "history")]);
      const recent = parseTurns(workingRaw);
      const all = parseTurns(historyRaw);
      return { working: recent, facts: facts.get(conversationId) ?? {}, retrieved: all.slice(-30, -WORKING_MEMORY_TURN_LIMIT) };
    } catch (error) {
      console.warn("[Lucy memory] Redis read failed; using in-process fallback:", error);
      return this.fallback.snapshot(conversationId);
    }
  }

  async isOptedOut(senderId: string) {
    return optedOut.has(senderId);
  }

  async optOut(senderId: string) {
    optedOut.add(senderId);
  }

  async optIn(senderId: string) {
    optedOut.delete(senderId);
  }
}

export const memoryStore: MemoryStore = new RedisMemoryStore();
