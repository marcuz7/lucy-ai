import { describe, expect, it } from "vitest";

describe("super-admin email configuration", () => {
  it("loads the configured single super-admin email without exposing unrelated values", () => {
    const configured = process.env.LUCY_SUPER_ADMIN_EMAIL?.trim().toLowerCase();

    expect(configured).toBe("marcuz7@gmail.com");
    expect(configured).not.toContain("gsk_");
    expect(configured).not.toContain("AC");
  });
});

export {};
