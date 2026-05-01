import type { ClipCandidate, TranscriptBoundary } from "@/lib/clips/boundaries";

const questionWords = /\b(why|how|what|when|where|who|which|should|could|would)\b/i;
const highEnergyWords =
  /\b(secret|mistake|never|always|worst|best|crazy|wild|shocking|truth|changed|money|growth|viral|broke|win|fail|problem|solution|hack)\b/i;

function scoreSegment(segment: TranscriptBoundary) {
  const words = segment.text.trim().split(/\s+/).filter(Boolean).length;
  let score = Math.min(30, words);
  if (questionWords.test(segment.text) || segment.text.includes("?")) score += 18;
  if (highEnergyWords.test(segment.text)) score += 22;
  if (/[!]/.test(segment.text)) score += 12;
  if (/\b(laugh|laughter|haha|wow)\b/i.test(segment.text)) score += 10;
  if (words >= 14 && words <= 35) score += 8;
  return score;
}

export function heuristicDetectClips(
  segments: TranscriptBoundary[],
  maxClips: number
): ClipCandidate[] {
  const scored = segments
    .map((segment, index) => ({ segment, index, score: scoreSegment(segment) }))
    .sort((a, b) => b.score - a.score);

  const candidates: ClipCandidate[] = [];

  for (const item of scored) {
    if (candidates.length >= maxClips * 2) break;
    const windowStart = Math.max(0, item.index - 2);
    const windowEnd = Math.min(segments.length - 1, item.index + 5);
    const window = segments.slice(windowStart, windowEnd + 1);
    const startMs = window[0]?.startMs ?? item.segment.startMs;
    const endMs = window.at(-1)?.endMs ?? item.segment.endMs;
    const titleSeed = item.segment.text.replace(/[^\w\s]/g, "").split(/\s+/).slice(0, 7).join(" ");
    const hasOverlap = candidates.some(
      (candidate) => startMs < candidate.endMs && endMs > candidate.startMs
    );

    if (!hasOverlap) {
      candidates.push({
        startMs,
        endMs,
        title: titleSeed || "High-retention moment",
        hook: item.segment.text.slice(0, 120),
        reason:
          "Heuristic fallback selected this section for questions, high-energy wording, density, or emotional punctuation.",
        viralScore: Math.max(45, Math.min(88, Math.round(item.score + 42)))
      });
    }
  }

  return candidates;
}
