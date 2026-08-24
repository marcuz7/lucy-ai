import type { InboundMessage, MemorySnapshot, MemoryStore, MemoryTurn, SpeakDecision } from "./types";

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
    working.set(conversationId, recent.slice(-12));
    history.set(conversationId, all.slice(-200));
  }

  async snapshot(conversationId: string): Promise<MemorySnapshot> {
    const recent = working.get(conversationId) ?? [];
    const all = history.get(conversationId) ?? [];
    // Production replacement: semantic vector search + cosine similarity + recency weighting.
    return { working: recent, facts: facts.get(conversationId) ?? {}, retrieved: all.slice(-30, -12) };
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

export const memoryStore = new InMemoryMemoryStore();
