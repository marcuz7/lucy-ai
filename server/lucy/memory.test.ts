import { describe, expect, it } from "vitest";
import { SHORT_TERM_MEMORY_TTL_SECONDS, SHORT_TERM_MEMORY_TURN_LIMIT, trimShortTermHistory } from "./memory";
import type { MemoryTurn } from "./types";

describe("Lucy short-term memory", () => {
  it("uses a 24-hour TTL and keeps the latest 20 turns", () => {
    expect(SHORT_TERM_MEMORY_TTL_SECONDS).toBe(86_400);
    expect(SHORT_TERM_MEMORY_TURN_LIMIT).toBe(20);

    const turns: MemoryTurn[] = Array.from({ length: 25 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : "assistant",
      text: `turn-${index}`,
      timestamp: index,
    }));

    expect(trimShortTermHistory(turns)).toHaveLength(20);
    expect(trimShortTermHistory(turns)[0]?.text).toBe("turn-5");
    expect(trimShortTermHistory(turns).at(-1)?.text).toBe("turn-24");
  });
});

export {};
