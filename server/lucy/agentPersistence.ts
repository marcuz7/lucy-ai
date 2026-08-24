import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { lucyAgentApprovals, lucyAgentRuns, lucyAgentToolCalls } from "../../drizzle/schema";
import { getDb } from "../db";
import type { AgentApprovalStatus, AgentProvider, AgentRunStatus, AgentToolStatus, InboundMessage } from "./types";

type AgentRunRecord = {
  id: string;
  messageId: string;
  chatId: string;
  senderId: string;
  provider: AgentProvider;
  status: AgentRunStatus;
  requestText: string;
  resultText: string | null;
  currentStep: number;
  maxSteps: number;
  toolCallsUsed: number;
  maxToolCalls: number;
  costUnitsUsed: number;
  maxCostUnits: number;
  cancelRequestedAt: Date | null;
  progressSentAt: Date | null;
  deadlineAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
};

type AgentToolCallRecord = {
  id: string;
  runId: string;
  sequence: number;
  toolName: string;
  arguments: Record<string, unknown>;
  status: AgentToolStatus;
  output: string | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

type AgentApprovalRecord = {
  id: string;
  runId: string;
  toolCallId: string;
  action: string;
  token: string;
  status: AgentApprovalStatus;
  requestedAt: Date;
  respondedAt: Date | null;
  expiresAt: Date;
};

const memoryRuns = new Map<string, AgentRunRecord>();
const memoryToolCalls = new Map<string, AgentToolCallRecord>();
const memoryApprovals = new Map<string, AgentApprovalRecord>();

const SECRET_KEY = /(token|secret|password|authorization|api[_-]?key|credential)/i;
const SECRET_VALUE = /(bearer\s+|sk[-_]|api[-_]?key[-_]?|token[-_]?)[a-z0-9._=-]{8,}/gi;

export function redactAgentText(value: string) {
  return value.replace(SECRET_VALUE, "[redacted]").replace(/([+]?\d[\d\s().-]{7,})/g, "[redacted-phone]");
}

export function redactAgentValue(value: unknown): unknown {
  if (typeof value === "string") return redactAgentText(value);
  if (Array.isArray(value)) return value.map(redactAgentValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, SECRET_KEY.test(key) ? "[redacted]" : redactAgentValue(entry)]));
  return value;
}

export async function createAgentRun(message: InboundMessage, options: { maxSteps?: number; deadlineMs?: number; maxToolCalls?: number; maxCostUnits?: number } = {}) {
  const now = new Date();
  const row: AgentRunRecord = {
    id: randomUUID(),
    messageId: message.id,
    chatId: message.chatId,
    senderId: message.senderId,
    provider: "managed",
    status: "queued",
    requestText: message.text,
    resultText: null,
    currentStep: 0,
    maxSteps: options.maxSteps ?? 6,
    toolCallsUsed: 0,
    maxToolCalls: options.maxToolCalls ?? 8,
    costUnitsUsed: 0,
    maxCostUnits: options.maxCostUnits ?? 20,
    cancelRequestedAt: null,
    progressSentAt: null,
    deadlineAt: new Date(now.getTime() + (options.deadlineMs ?? 90_000)),
    startedAt: null,
    completedAt: null,
    lastError: null,
    createdAt: now,
  };
  memoryRuns.set(row.id, row);
  const db = await getDb();
  if (db) {
    await db.insert(lucyAgentRuns).values(row);
  }
  return row;
}

export async function updateAgentRun(id: string, patch: Partial<Pick<AgentRunRecord, "status" | "resultText" | "currentStep" | "toolCallsUsed" | "costUnitsUsed" | "cancelRequestedAt" | "progressSentAt" | "startedAt" | "completedAt" | "lastError">>) {
  const safePatch = { ...patch, ...(patch.lastError !== undefined ? { lastError: patch.lastError === null ? null : redactAgentText(patch.lastError) } : {}) };
  const current = memoryRuns.get(id);
  if (current) memoryRuns.set(id, { ...current, ...safePatch });
  const db = await getDb();
  if (db) await db.update(lucyAgentRuns).set(safePatch).where(eq(lucyAgentRuns.id, id));
}

export async function requestAgentRunCancellation(id: string) {
  const now = new Date();
  const current = memoryRuns.get(id);
  if (current) {
    if (["completed", "failed", "cancelled", "limit_reached"].includes(current.status)) return false;
    memoryRuns.set(id, { ...current, cancelRequestedAt: now });
    const db = await getDb();
    if (db) await db.update(lucyAgentRuns).set({ cancelRequestedAt: now }).where(eq(lucyAgentRuns.id, id));
    return true;
  }
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ status: lucyAgentRuns.status }).from(lucyAgentRuns).where(eq(lucyAgentRuns.id, id)).limit(1);
  if (!rows[0] || ["completed", "failed", "cancelled", "limit_reached"].includes(rows[0].status)) return false;
  await db.update(lucyAgentRuns).set({ cancelRequestedAt: now }).where(eq(lucyAgentRuns.id, id));
  return true;
}

export async function isAgentRunCancellationRequested(id: string) {
  const current = memoryRuns.get(id);
  if (current?.cancelRequestedAt) return true;
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ cancelRequestedAt: lucyAgentRuns.cancelRequestedAt }).from(lucyAgentRuns).where(eq(lucyAgentRuns.id, id)).limit(1);
  return Boolean(rows[0]?.cancelRequestedAt);
}

export async function createAgentToolCall(runId: string, sequence: number, toolName: string, args: Record<string, unknown>) {
  const now = new Date();
  const row: AgentToolCallRecord = { id: randomUUID(), runId, sequence, toolName, arguments: redactAgentValue(args) as Record<string, unknown>, status: "requested", output: null, error: null, startedAt: null, completedAt: null, createdAt: now };
  memoryToolCalls.set(row.id, row);
  const db = await getDb();
  if (db) await db.insert(lucyAgentToolCalls).values(row);
  return row;
}

export async function updateAgentToolCall(id: string, patch: Partial<Pick<AgentToolCallRecord, "status" | "output" | "error" | "startedAt" | "completedAt">>) {
  const current = memoryToolCalls.get(id);
  const safePatch = { ...patch, ...(patch.output !== undefined ? { output: patch.output === null ? null : redactAgentText(patch.output) } : {}), ...(patch.error !== undefined ? { error: patch.error === null ? null : redactAgentText(patch.error) } : {}) };
  if (current) memoryToolCalls.set(id, { ...current, ...safePatch });
  const db = await getDb();
  if (db) await db.update(lucyAgentToolCalls).set(safePatch).where(eq(lucyAgentToolCalls.id, id));
}

export async function createAgentApproval(input: { runId: string; toolCallId: string; action: string; expiresInMs?: number }) {
  const now = new Date();
  const row: AgentApprovalRecord = { id: randomUUID(), runId: input.runId, toolCallId: input.toolCallId, action: input.action.slice(0, 255), token: randomUUID().replaceAll("-", ""), status: "pending", requestedAt: now, respondedAt: null, expiresAt: new Date(now.getTime() + (input.expiresInMs ?? 10 * 60_000)) };
  memoryApprovals.set(row.id, row);
  const db = await getDb();
  if (db) await db.insert(lucyAgentApprovals).values(row);
  return row;
}

export async function resolveAgentApproval(token: string, status: Extract<AgentApprovalStatus, "approved" | "denied">) {
  const now = new Date();
  Array.from(memoryApprovals.entries()).forEach(([id, row]) => {
    if (row.token === token) memoryApprovals.set(id, { ...row, status, respondedAt: now });
  });
  const db = await getDb();
  if (db) await db.update(lucyAgentApprovals).set({ status, respondedAt: now }).where(eq(lucyAgentApprovals.token, token));
}

export async function getAgentRunDetail(runId: string) {
  const db = await getDb();
  if (!db) {
    const run = memoryRuns.get(runId);
    if (!run) return null;
    return { run, toolCalls: Array.from(memoryToolCalls.values()).filter(call => call.runId === runId).sort((a, b) => a.sequence - b.sequence), approvals: Array.from(memoryApprovals.values()).filter(approval => approval.runId === runId) };
  }
  const [runs, toolCalls, approvals] = await Promise.all([
    db.select().from(lucyAgentRuns).where(eq(lucyAgentRuns.id, runId)).limit(1),
    db.select().from(lucyAgentToolCalls).where(eq(lucyAgentToolCalls.runId, runId)).orderBy(lucyAgentToolCalls.sequence),
    db.select({ id: lucyAgentApprovals.id, runId: lucyAgentApprovals.runId, toolCallId: lucyAgentApprovals.toolCallId, action: lucyAgentApprovals.action, status: lucyAgentApprovals.status, requestedAt: lucyAgentApprovals.requestedAt, respondedAt: lucyAgentApprovals.respondedAt, expiresAt: lucyAgentApprovals.expiresAt }).from(lucyAgentApprovals).where(eq(lucyAgentApprovals.runId, runId)),
  ]);
  return runs[0] ? { run: runs[0], toolCalls, approvals } : null;
}

export async function getRecentAgentRuns(limit = 50) {
  const db = await getDb();
  if (!db) return Array.from(memoryRuns.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  return db.select({ id: lucyAgentRuns.id, messageId: lucyAgentRuns.messageId, chatId: lucyAgentRuns.chatId, senderId: lucyAgentRuns.senderId, provider: lucyAgentRuns.provider, status: lucyAgentRuns.status, requestText: lucyAgentRuns.requestText, resultText: lucyAgentRuns.resultText, currentStep: lucyAgentRuns.currentStep, maxSteps: lucyAgentRuns.maxSteps, toolCallsUsed: lucyAgentRuns.toolCallsUsed, maxToolCalls: lucyAgentRuns.maxToolCalls, costUnitsUsed: lucyAgentRuns.costUnitsUsed, maxCostUnits: lucyAgentRuns.maxCostUnits, cancelRequestedAt: lucyAgentRuns.cancelRequestedAt, progressSentAt: lucyAgentRuns.progressSentAt, deadlineAt: lucyAgentRuns.deadlineAt, startedAt: lucyAgentRuns.startedAt, completedAt: lucyAgentRuns.completedAt, lastError: lucyAgentRuns.lastError, createdAt: lucyAgentRuns.createdAt }).from(lucyAgentRuns).orderBy(desc(lucyAgentRuns.createdAt)).limit(limit);
}
