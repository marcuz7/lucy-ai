import { describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";

describe("OAuth persistence schema", () => {
  it("exports the users table with the identity fields required by the callback", () => {
    expect(users).toBeDefined();
    expect(users.openId).toBeDefined();
    expect(users.role).toBeDefined();
    expect(users.lastSignedIn).toBeDefined();
  });
});
