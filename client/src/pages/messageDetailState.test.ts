import { describe, expect, it } from "vitest";
import { getDetailState } from "./messageDetailState";

describe("message detail state", () => {
  it.each([
    [{ isLoading: true, isError: false, hasData: false }, "loading"],
    [{ isLoading: false, isError: true, hasData: false }, "error"],
    [{ isLoading: false, isError: false, hasData: false }, "not-found"],
    [{ isLoading: false, isError: false, hasData: true }, "ready"],
  ] as const)("maps query state to %s", (input, expected) => {
    expect(getDetailState(input)).toBe(expected);
  });
});
