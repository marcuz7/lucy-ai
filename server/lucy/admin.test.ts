import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function context(role: "admin" | "user", openId = role === "admin" ? process.env.OWNER_OPEN_ID : "test-user", email = openId === process.env.OWNER_OPEN_ID ? (process.env.LUCY_SUPER_ADMIN_EMAIL ?? "superadmin@example.com") : "test@example.com"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 42, openId: openId ?? "", name: "Test User", email, loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("admin BYO LLM access", () => {
  it("rejects regular users from reading, saving, or testing BYO LLM", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.llm.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.llm.save({ provider: "openai-compatible", apiKey: "secret-key-123", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.llm.test()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to read masked BYO LLM status", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.llm.status()).resolves.toMatchObject({ configured: false, apiKeyConfigured: false });
  });
});

describe("super-admin secret access", () => {
  it("rejects a non-owner admin from provider secrets", async () => {
    const caller = appRouter.createCaller(context("admin", "different-admin"));
    await expect(caller.search.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.llm.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.twilio.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.telnyx.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an owner-id session when its email is not the configured super-admin email", async () => {
    const caller = appRouter.createCaller(context("admin", process.env.OWNER_OPEN_ID, "other@example.com"));
    await expect(caller.llm.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.search.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows the exact configured super-admin email even when the open ID differs", async () => {
    const caller = appRouter.createCaller(context("admin", "current-google-open-id", process.env.LUCY_SUPER_ADMIN_EMAIL));
    await expect(caller.llm.status()).resolves.toMatchObject({ configured: false });
    await expect(caller.search.status()).resolves.toMatchObject({ configured: false });
  });
});

describe("admin Tavily search access", () => {
  it("rejects regular users from reading, saving, or testing Tavily", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.search.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.search.save({ apiKey: "tavily-key-123" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.search.test()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to read masked Tavily status", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.search.status()).resolves.toMatchObject({ configured: false });
  });

  it("rejects an invalid short Tavily key before persistence", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.search.save({ apiKey: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("admin Telnyx access", () => {
  it("rejects a regular user", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.telnyx.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to read masked status", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.telnyx.status()).resolves.toMatchObject({ configured: false });
  });

  it("rejects regular users from saving or testing Telnyx", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.telnyx.save({ apiKey: "telnyx-key-123", publicKey: "-----BEGIN PUBLIC KEY-----", phoneNumber: "+15551234567", allowedSenders: ["+15550000001"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.telnyx.test()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin Twilio access", () => {
  it("rejects a regular user", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.twilio.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects regular users from saving or testing Twilio", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.twilio.save({ accountSid: "AC1234567890", authToken: "auth-token-123", phoneNumber: "+15551234567", allowedSenders: ["+15550000001"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.twilio.test()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to read masked status and dashboard data", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.twilio.status()).resolves.toMatchObject({ configured: false });
    await expect(caller.dashboard.summary()).resolves.toHaveProperty("queue");
  });

  it("rejects a regular user from the dashboard", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.dashboard.summary()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to query message detail and returns null for an unknown message", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.dashboard.messageDetail({ messageId: "missing-message" })).resolves.toBeNull();
  });

  it("rejects regular users from message detail", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.dashboard.messageDetail({ messageId: "missing-message" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows admins to request cancellation but does not acknowledge unknown runs", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.dashboard.cancelAgentRun({ runId: "00000000-0000-4000-8000-000000000000" })).resolves.toEqual({ accepted: false });
  });

  it("rejects regular users from cancelling agent runs", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.dashboard.cancelAgentRun({ runId: "00000000-0000-4000-8000-000000000000" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
