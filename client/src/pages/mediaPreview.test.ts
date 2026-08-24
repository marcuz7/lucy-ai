import { describe, expect, it } from "vitest";
import { mediaPreviewKind } from "./mediaPreview";

describe("media preview kind", () => {
  it.each([["image/jpeg", "image"], ["audio/mpeg", "audio"], ["application/pdf", "link"]] as const)("classifies %s as %s", (contentType, expected) => {
    expect(mediaPreviewKind(contentType)).toBe(expected);
  });
});
