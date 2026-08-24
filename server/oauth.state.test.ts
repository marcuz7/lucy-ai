import { describe, expect, it } from "vitest";
import { decodeOAuthState, encodeOAuthState } from "../shared/const";

describe("OAuth state", () => {
  it("round-trips redirect URI and CSRF nonce", () => {
    const state = { redirectUri: "https://example.test/admin", nonce: "nonce-123" };
    expect(decodeOAuthState(encodeOAuthState(state))).toEqual(state);
  });

  it("returns an empty redirect for malformed base64", () => {
    expect(decodeOAuthState("not valid base64 !!!")).toEqual({ redirectUri: "" });
  });

  it("supports legacy redirect-only state without inventing a nonce", () => {
    expect(decodeOAuthState(btoa("https://example.test/"))).toEqual({ redirectUri: "https://example.test/" });
  });
});
