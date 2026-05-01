import { describe, expect, it } from "vitest";
import { normalizeClipCandidates, validateClipBoundary } from "@/lib/clips/boundaries";

const segments = [
  { startMs: 0, endMs: 7_000, text: "Intro" },
  { startMs: 7_000, endMs: 16_000, text: "Strong question?" },
  { startMs: 16_000, endMs: 31_000, text: "Useful answer" },
  { startMs: 31_000, endMs: 52_000, text: "Resolution" },
  { startMs: 52_000, endMs: 75_000, text: "Too far" }
];

describe("clip boundary validation", () => {
  it("validates 15 to 60 second boundaries", () => {
    expect(validateClipBoundary({ startMs: 0, endMs: 15_000 })).toBe(true);
    expect(validateClipBoundary({ startMs: 0, endMs: 61_000 })).toBe(false);
  });

  it("normalizes short candidates to transcript boundaries", () => {
    const [clip] = normalizeClipCandidates({
      candidates: [
        {
          startMs: 8_000,
          endMs: 12_000,
          title: "Question",
          hook: "Strong question?",
          reason: "Question hook",
          viralScore: 80
        }
      ],
      segments,
      maxClips: 1
    });

    expect(clip.endMs - clip.startMs).toBeGreaterThanOrEqual(15_000);
    expect(validateClipBoundary(clip)).toBe(true);
  });
});
