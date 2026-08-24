import { describe, expect, it } from "vitest";
import { HeuristicSpeakClassifier } from "./classifier";
import { chunksFor, safeProgressText } from "./pipeline";
import { routeMessage } from "./engine";
import type { InboundMessage } from "./types";

const message: InboundMessage = {
  id: "msg-1",
  channel: "twilio-sms",
  senderId: "+15550000000",
  chatId: "+15550000000",
  text: "hey everyone",
  timestamp: 1,
  media: [],
};

describe("Lucy message pipeline", () => {
  it("stays silent for casual banter and speaks when directly addressed", async () => {
    const classifier = new HeuristicSpeakClassifier();
    await expect(classifier.decide(message, [])).resolves.toMatchObject({ shouldSpeak: false, reason: "casual-banter" });
    await expect(classifier.decide({ ...message, text: "Lucy, can you plan dinner?" }, [])).resolves.toMatchObject({ shouldSpeak: true, reason: "direct-address" });
  });

  it("routes specialized requests before the general conversation engine", () => {
    expect(routeMessage("make an image of a sunset")).toBe("image-generation");
    expect(routeMessage("what is the weather today?")).toBe("web-rag");
    expect(routeMessage("write us a song")).toBe("music-generation");
    expect(routeMessage("help me decide")).toBe("conversation");
  });

  it("splits long replies into mobile-friendly chunks with delay metadata", () => {
    const chunks = chunksFor("a ".repeat(500), "chat-1");
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.delayMs).toBeGreaterThan(0);
    expect(chunks.map(chunk => chunk.sequence)).toEqual(chunks.map((_chunk, index) => index));
    expect(chunks.every(chunk => chunk.text.length <= 320)).toBe(true);
  });

  it("redacts secret-like values from progress messages", () => {
    expect(safeProgressText("token=sk-progress-secret +15550000000")).toBe("[redacted] [redacted-phone]");
  });
});
