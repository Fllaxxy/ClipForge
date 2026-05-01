import { describe, expect, it } from "vitest";
import { parseClipDetectionJson } from "@/lib/ai/schemas";

describe("AI response validation", () => {
  it("parses fenced JSON and repairs trailing commas", () => {
    const result = parseClipDetectionJson(`\`\`\`json
{
  "clips": [
    {
      "startMs": 123000,
      "endMs": 167000,
      "title": "Short title",
      "hook": "First-line hook",
      "reason": "Strong curiosity gap",
      "viralScore": 87,
    },
  ],
}
\`\`\``);

    expect(result.clips[0].viralScore).toBe(87);
  });

  it("rejects malformed clip scores", () => {
    expect(() =>
      parseClipDetectionJson(
        JSON.stringify({
          clips: [
            {
              startMs: 0,
              endMs: 10_000,
              title: "Bad",
              hook: "Bad",
              reason: "Bad",
              viralScore: 120
            }
          ]
        })
      )
    ).toThrow();
  });
});
