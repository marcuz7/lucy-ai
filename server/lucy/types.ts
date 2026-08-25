export type Channel = "twilio-sms" | "telnyx-sms" | "android-sms" | "imessage-relay" | "rcs";

export type MediaAttachment = {
  url: string;
  contentType?: string;
};

export type InboundMessage = {
  id: string;
  channel: Channel;
  senderId: string;
  chatId: string;
  text: string;
  timestamp: number;
  media: MediaAttachment[];
};

export type SpeakDecision = {
  shouldSpeak: boolean;
  reason: "direct-address" | "question" | "clear-assist" | "casual-banter" | "opted-out" | "rate-limited" | "stub-default";
  confidence: number;
};

export type EngineRoute = "conversation" | "web-rag" | "image-generation" | "music-generation";

export type AgentProvider = "managed" | "sandbox";
export type AgentRunStatus = "queued" | "planning" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled" | "limit_reached";
export type AgentToolStatus = "requested" | "running" | "succeeded" | "failed" | "denied";
export type AgentApprovalStatus = "pending" | "approved" | "denied" | "expired";

export type AgentProgressEvent = {
  runId: string;
  chatId: string;
  text: string;
  kind: "started" | "tool" | "completed" | "failed" | "approval";
};

export type AgentRunInput = {
  message: InboundMessage;
  memory: MemorySnapshot;
  maxSteps?: number;
  maxToolCalls?: number;
  maxCostUnits?: number;
  deadlineMs?: number;
  onProgress?: (event: AgentProgressEvent) => Promise<void>;
};

export type AgentRunResult = {
  runId: string;
  status: "completed" | "failed" | "cancelled" | "limit_reached" | "awaiting_approval";
  text: string;
};

export type AgentExecutionProvider = {
  name: AgentProvider;
  run(input: AgentRunInput): Promise<AgentRunResult>;
};

export type OutboundChunk = {
  id: string;
  conversationId: string;
  text: string;
  delayMs: number;
  sequence: number;
};

export type MemoryTurn = {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

export type MemorySnapshot = {
  working: MemoryTurn[];
  facts: Record<string, string>;
  retrieved: MemoryTurn[];
};

export interface ChannelAdapter {
  sendText(recipientId: string, text: string): Promise<{ providerMessageId?: string }>;
}

export interface SpeakClassifier {
  decide(message: InboundMessage, recent: MemoryTurn[]): Promise<SpeakDecision>;
}

export interface LucyEngine {
  respond(input: { message: InboundMessage; memory: MemorySnapshot; route: EngineRoute }): Promise<string>;
}

export interface MemoryStore {
  saveInbound(message: InboundMessage): Promise<void>;
  saveDecision(messageId: string, decision: SpeakDecision): Promise<void>;
  appendTurn(conversationId: string, turn: MemoryTurn): Promise<void>;
  snapshot(conversationId: string): Promise<MemorySnapshot>;
  isOptedOut(senderId: string): Promise<boolean>;
  optOut(senderId: string): Promise<void>;
  optIn(senderId: string): Promise<void>;
}
