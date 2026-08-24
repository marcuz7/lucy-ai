import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("application title", () => {
  it("does not expose the legacy Boba project title in browser metadata", () => {
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(html).toContain("<title>LucyAi · Your first AI agent</title>");
    expect(html).not.toContain("Boba Landing Recreation");
  });
});
