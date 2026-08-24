import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InboundMessage, MemorySnapshot } from "./types";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("../_core/llm", () => ({ invokeLLM }));
vi.mock("../db", () => ({ getDb: vi.fn(async () => null) }));
vi.mock("./agentTools", () => ({
  SAFE_AGENT_TOOLS: [{ type: "function", function: { name: "public_web_lookup" } }],
  executeSafeAgentTool: vi.fn(async (name: string) => {
    if (name !== "public_web_lookup") throw new Error(`Tool '${name}' is not allowlisted`);
    return "source output";
  }),
}));

import { runManagedAgent } from "./agent";
import { executeSafeAgentTool, SAFE_AGENT_TOOLS } from "./agentTools";
import { createAgentRun, createAgentToolCall, getAgentRunDetail, getRecentAgentRuns, redactAgentText, redactAgentValue, requestAgentRunCancellation, updateAgentToolCall } from "./agentPersistence";

const message: InboundMessage = {
  id: "agent-message-1",
  channel: "twilio-sms",
  senderId: "+15550000000",
  chatId: "+15550000000",
  text: "Lucy, search for the latest launch news",
  timestamp: Date.now(),
  media: [],
};

const memory: MemorySnapshot = { working: [], facts: {}, retrieved: [] };

describe("Lucy managed agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUILT_IN_FORGE_API_KEY = "test-forge-key";
  });

  it("exposes only the initial read-only tool set", async () => {
    expect(SAFE_AGENT_TOOLS.map(tool => tool.function.name)).toEqual(["public_web_lookup"]);
    await expect(executeSafeAgentTool("shell", {})).rejects.toThrow("not allowlisted");
  });

  it("executes a tool call, feeds the result back, and returns the final SMS result", async () => {
    invokeLLM
      .mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "", tool_calls: [{ id: "call-1", type: "function", function: { name: "public_web_lookup", arguments: '{"query":"launch news"}' } }] } }] })
      .mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "I found one useful source." } }] });

    const result = await runManagedAgent({ message, memory });

    expect(result.status).toBe("completed");
    expect(result.text).toBe("I found one useful source.");
    expect(invokeLLM).toHaveBeenCalledTimes(2);
    expect(invokeLLM.mock.calls[1][0].messages.some((entry: { role: string; tool_call_id?: string; content: unknown }) => entry.role === "tool" && entry.tool_call_id === "call-1" && entry.content === "source output")).toBe(true);
  });

  it("stops before the LLM continues when an admin cancellation is requested", async () => {
    invokeLLM.mockImplementationOnce(async () => {
      const [run] = await getRecentAgentRuns(1);
      expect(run).toBeTruthy();
      await requestAgentRunCancellation(run.id);
      return { choices: [{ message: { role: "assistant", content: "This should not be delivered." } }] };
    });

    const result = await runManagedAgent({ message, memory });

    expect(result.status).toBe("cancelled");
    expect(result.text).toContain("stopped this run");
  });

  it("terminates with a durable limit outcome when a tool exceeds the run budget", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "", tool_calls: [{ id: "call-budget", type: "function", function: { name: "public_web_lookup", arguments: '{"query":"budget"}' } }] } }] });

    const result = await runManagedAgent({ message, memory, maxCostUnits: 1 });

    expect(result.status).toBe("limit_reached");
    expect(result.text).toContain("safe tool budget");
  });

  it("terminates with a limit outcome when the tool-call budget is exhausted", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { role: "assistant", content: "", tool_calls: [
      { id: "call-one", type: "function", function: { name: "public_web_lookup", arguments: '{"query":"one"}' } },
      { id: "call-two", type: "function", function: { name: "public_web_lookup", arguments: '{"query":"two"}' } },
    ] } }] });

    const result = await runManagedAgent({ message, memory, maxToolCalls: 1 });

    expect(result.status).toBe("limit_reached");
    expect(result.text).toContain("tool-call limit");
  });

  it("terminates with a deadline result when the time budget is already exhausted", async () => {
    const result = await runManagedAgent({ message, memory, deadlineMs: -1 });

    expect(result.status).toBe("failed");
    expect(result.text).toContain("needs more time");
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("redacts secrets and phone numbers from persisted agent audit values", async () => {
    expect(redactAgentText("token=sk-test-secret  +15550000000")).toBe("[redacted]  [redacted-phone]");
    expect(redactAgentValue({ apiKey: "sk-test-secret", nested: { phone: "+15550000000" } })).toEqual({ apiKey: "[redacted]", nested: { phone: "[redacted-phone]" } });
    const run = await createAgentRun(message);
    const call = await createAgentToolCall(run.id, 1, "read_public_json_api", { apiKey: "sk-test-secret", phone: "+15550000000" });
    await updateAgentToolCall(call.id, { output: "token=sk-output-secret +15550000000" });
    const detail = await getAgentRunDetail(run.id);
    expect(detail?.toolCalls[0]?.arguments).toEqual({ apiKey: "[redacted]", phone: "[redacted-phone]" });
    expect(detail?.toolCalls[0]?.output).toBe("[redacted] [redacted-phone]");
  });
});
