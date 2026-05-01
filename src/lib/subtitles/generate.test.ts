import { describe, expect, it } from "vitest";
import { generateAssSubtitles, generateSrtSubtitles } from "@/lib/subtitles/generate";

const segments = [
  { startMs: 0, endMs: 2500, text: "This is a powerful hook" },
  { startMs: 2500, endMs: 5000, text: "Keep watching for the payoff" }
];

describe("subtitle generation", () => {
  it("generates ASS subtitles with style and events", () => {
    const ass = generateAssSubtitles({ segments, style: { wordsPerCaptionChunk: 3 } });
    expect(ass).toContain("[V4+ Styles]");
    expect(ass).toContain("Dialogue:");
    expect(ass).toContain("PlayResY: 1920");
  });

  it("generates downloadable SRT subtitles", () => {
    const srt = generateSrtSubtitles(segments);
    expect(srt).toContain("00:00:00,000 --> 00:00:02,500");
    expect(srt).toContain("This is a powerful hook");
  });
});
