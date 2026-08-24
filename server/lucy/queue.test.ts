import { describe, expect, it } from "vitest";
import { decodeQueuePayload } from "./queue";

describe("Lucy queue payload decoding", () => {
  const message = { id: "m-1", channel: "sms", senderId: "+15551234567", chatId: "chat-1", text: "Hello", media: [] };

  it("accepts an object returned by a JSON column", () => {
    expect(decodeQueuePayload(message)).toEqual(message);
  });

  it("accepts a stringified JSON payload", () => {
    expect(decodeQueuePayload(JSON.stringify(message))).toEqual(message);
  });
});
