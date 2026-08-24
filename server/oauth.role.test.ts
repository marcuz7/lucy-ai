import { describe, expect, it } from "vitest";
import { getOAuthRole } from "./_core/oauth";

describe("Google OAuth role assignment", () => {
  it("assigns admin to the configured exact super-admin email", () => {
    expect(getOAuthRole("different-open-id", " MARCUZ7@GMAIL.COM ")).toBe("admin");
  });

  it("assigns admin to the configured owner identity", () => {
    expect(getOAuthRole(process.env.OWNER_OPEN_ID ?? "", "other@example.com")).toBe("admin");
  });

  it("keeps other Google accounts as regular users", () => {
    expect(getOAuthRole("unrelated-open-id", "other@example.com")).toBe("user");
  });
});

export {};
