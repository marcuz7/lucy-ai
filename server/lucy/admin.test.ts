import { describe, expect, it } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function context(role: "admin" | "user"): TrpcContext {
  const now = new Date();
  return {
    user: { id: 42, openId: "test-user", name: "Test User", email: "test@example.com", loginMethod: "test", role, createdAt: now, updatedAt: now, lastSignedIn: now },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

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
