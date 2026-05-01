export const MIN_CLIP_MS = 15_000;
export const MAX_CLIP_MS = 60_000;
const MERGE_GAP_MS = 5_000;

export type TranscriptBoundary = {
  startMs: number;
  endMs: number;
  text: string;
};

export type ClipCandidate = {
  startMs: number;
  endMs: number;
  title: string;
  hook: string;
  reason: string;
  viralScore: number;
};

export function validateClipBoundary(candidate: Pick<ClipCandidate, "startMs" | "endMs">) {
  const durationMs = candidate.endMs - candidate.startMs;
  return (
    Number.isInteger(candidate.startMs) &&
    Number.isInteger(candidate.endMs) &&
    candidate.startMs >= 0 &&
    candidate.endMs > candidate.startMs &&
    durationMs >= MIN_CLIP_MS &&
    durationMs <= MAX_CLIP_MS
  );
}

function alignStart(startMs: number, segments: TranscriptBoundary[]) {
  const previous = [...segments].reverse().find((segment) => segment.startMs <= startMs);
  return previous && Math.abs(previous.startMs - startMs) <= 4_000 ? previous.startMs : startMs;
}

function alignEnd(endMs: number, segments: TranscriptBoundary[]) {
  const next = segments.find((segment) => segment.endMs >= endMs);
  return next && Math.abs(next.endMs - endMs) <= 4_000 ? next.endMs : endMs;
}

export function normalizeClipBoundary(
  candidate: ClipCandidate,
  segments: TranscriptBoundary[],
  videoDurationMs?: number
): ClipCandidate {
  let startMs = Math.max(0, alignStart(candidate.startMs, segments));
  let endMs = alignEnd(candidate.endMs, segments);

  if (videoDurationMs) {
    endMs = Math.min(endMs, videoDurationMs);
  }

  if (endMs - startMs < MIN_CLIP_MS) {
    const targetEnd = startMs + MIN_CLIP_MS;
    const expanded = segments.find((segment) => segment.endMs >= targetEnd);
    endMs = expanded?.endMs ?? targetEnd;
  }

  if (endMs - startMs > MAX_CLIP_MS) {
    const maxEnd = startMs + MAX_CLIP_MS;
    const safeEnd = [...segments]
      .filter((segment) => segment.endMs <= maxEnd && segment.endMs > startMs + MIN_CLIP_MS)
      .at(-1)?.endMs;
    endMs = safeEnd ?? maxEnd;
  }

  if (videoDurationMs && endMs > videoDurationMs) {
    const overflow = endMs - videoDurationMs;
    startMs = Math.max(0, startMs - overflow);
    endMs = videoDurationMs;
  }

  return {
    ...candidate,
    startMs,
    endMs,
    viralScore: Math.max(0, Math.min(100, Math.round(candidate.viralScore)))
  };
}

export function mergeNearbyCandidates(candidates: ClipCandidate[]) {
  const ordered = [...candidates].sort((a, b) => a.startMs - b.startMs);
  const merged: ClipCandidate[] = [];

  for (const candidate of ordered) {
    const previous = merged.at(-1);
    if (
      previous &&
      candidate.startMs - previous.endMs <= MERGE_GAP_MS &&
      candidate.endMs - previous.startMs <= MAX_CLIP_MS
    ) {
      const candidateWins = candidate.viralScore > previous.viralScore;
      previous.endMs = Math.max(previous.endMs, candidate.endMs);
      previous.viralScore = Math.max(previous.viralScore, candidate.viralScore);
      previous.reason = `${previous.reason} ${candidate.reason}`.slice(0, 500);
      if (candidateWins) {
        previous.title = candidate.title;
        previous.hook = candidate.hook;
      }
    } else {
      merged.push({ ...candidate });
    }
  }

  return merged;
}

export function normalizeClipCandidates(input: {
  candidates: ClipCandidate[];
  segments: TranscriptBoundary[];
  videoDurationMs?: number;
  maxClips: number;
}) {
  return mergeNearbyCandidates(
    input.candidates.map((candidate) =>
      normalizeClipBoundary(candidate, input.segments, input.videoDurationMs)
    )
  )
    .filter(validateClipBoundary)
    .sort((a, b) => b.viralScore - a.viralScore)
    .slice(0, input.maxClips)
    .sort((a, b) => a.startMs - b.startMs);
}
