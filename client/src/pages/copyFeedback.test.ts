import { describe, expect, it } from "vitest";
import { copyFeedbackLabel } from "./copyFeedback";

describe("phone demo copy feedback", () => {
  it("communicates the idle and copied states", () => {
    expect(copyFeedbackLabel(false)).toBe("Copy");
    expect(copyFeedbackLabel(true)).toBe("Copied");
  });
});
