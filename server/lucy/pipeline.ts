import { memoryStore } from "./memory";
import { recordConversationEvent } from "./history";
import { HeuristicSpeakClassifier } from "./classifier";
import { runManagedAgent } from "./agent";
import { redactAgentText } from "./agentPersistence";
import type { ChannelAdapter, InboundMessage, OutboundChunk } from "./types";

const classifier = new HeuristicSpeakClassifier();
export function safeProgressText(text: string) {
  return redactAgentText(text);
}

function chunksFor(text: string, conversationId: string): OutboundChunk[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const pieces = normalized.match(/.{1,320}(?:\s|$)/g)?.map(piece => piece.trim()).filter(Boolean) ?? [normalized];
  return pieces.map((piece, sequence) => ({ id: `${conversationId}:${Date.now()}:${sequence}`, conversationId, text: piece, sequence, delayMs: Math.min(1600, 280 + piece.length * 12) }));
}

export async function processInbound(message: InboundMessage, adapter: ChannelAdapter) {
  if (await memoryStore.isOptedOut(message.senderId)) return;
  await memoryStore.saveInbound(message);
  await recordConversationEvent({ chatId: message.chatId, messageId: message.id, role: "user", text: message.text });
  const memory = await memoryStore.snapshot(message.chatId);
  const decision = await classifier.decide(message, memory.working);
  await memoryStore.saveDecision(message.id, decision);
  if (!decision.shouldSpeak) return;

  const result = await runManagedAgent({
    message,
    memory,
    onProgress: async event => {
      const safeProgress = safeProgressText(event.text);
      await recordConversationEvent({ chatId: message.chatId, messageId: message.id, role: "system", text: `Lucy progress: ${safeProgress}` });
      await adapter.sendText(message.senderId, safeProgress);
    },
  });
  const response = result.text;
  await memoryStore.appendTurn(message.chatId, { role: "assistant", text: response, timestamp: Date.now() });
  await recordConversationEvent({ chatId: message.chatId, messageId: message.id, role: "assistant", text: response });
  for (const chunk of chunksFor(response, message.chatId)) {
    // The delay is metadata for a channel adapter. A real adapter can send typing
    // indicators, sleep, then dispatch. Stub mode sends immediately.
    await adapter.sendText(message.senderId, chunk.text);
  }
}

export { chunksFor };
