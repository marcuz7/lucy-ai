import { describe, expect, it } from "vitest";
import { validateRedisUrl } from "./credentials";

describe("Redis credential validation", () => {
  it("accepts redis and rediss URLs", () => {
    expect(validateRedisUrl("redis://localhost:6379")).toBe("redis://localhost:6379");
    expect(validateRedisUrl(" rediss://:secret@example.com:6380 ")).toBe("rediss://:secret@example.com:6380");
  });

  it("rejects empty, malformed, and unrelated URLs", () => {
    expect(() => validateRedisUrl("")).toThrow("Redis URL is required");
    expect(() => validateRedisUrl("https://example.com")).toThrow("redis:// or rediss://");
    expect(() => validateRedisUrl("not-a-url")).toThrow();
  });
});

export {};
