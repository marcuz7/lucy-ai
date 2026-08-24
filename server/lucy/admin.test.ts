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

describe("admin Twilio access", () => {
  it("rejects a regular user", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.twilio.status()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an admin to read masked status", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.twilio.status()).resolves.toMatchObject({ configured: false });
  });
});
