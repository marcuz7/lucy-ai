import type { InboundMessage, MemoryTurn, SpeakClassifier, SpeakDecision } from "./types";

const OPT_OUT = /^(stop|cancel|unsubscribe|end|quit|arret)$/i;
const DIRECT_ADDRESS = /\b(lucy|boba|hey there|assistant)\b/i;
const QUESTION = /\?|\b(can|could|would|should|where|when|what|how|who|find|help|plan|draft|make|create)\b/i;

export class HeuristicSpeakClassifier implements SpeakClassifier {
  async decide(message: InboundMessage, _recent: MemoryTurn[]): Promise<SpeakDecision> {
    if (OPT_OUT.test(message.text.trim())) {
      return { shouldSpeak: false, reason: "opted-out", confidence: 1 };
    }
    if (DIRECT_ADDRESS.test(message.text)) {
      return { shouldSpeak: true, reason: "direct-address", confidence: 0.98 };
    }
    if (QUESTION.test(message.text)) {
      return { shouldSpeak: true, reason: "question", confidence: 0.86 };
    }
    return { shouldSpeak: false, reason: "casual-banter", confidence: 0.84 };
  }
}
