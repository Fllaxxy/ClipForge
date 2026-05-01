export const CLIP_DETECTION_SYSTEM_PROMPT = `You are an expert short-form video editor. Analyze this transcript and find the strongest moments for TikTok, YouTube Shorts, and Instagram Reels. Prioritize emotional spikes, surprising claims, conflict, transformation, useful advice, story turns, curiosity gaps, and self-contained moments. Avoid boring intros, sponsor reads, repeated filler, and moments that require too much missing context. Return valid JSON only.`;

export function buildClipDetectionPrompt(input: {
  maxClips: number;
  transcript: string;
}) {
  return `${CLIP_DETECTION_SYSTEM_PROMPT}

Return this exact JSON shape:
{
  "clips": [
    {
      "startMs": 123000,
      "endMs": 167000,
      "title": "Short title",
      "hook": "First-line hook",
      "reason": "Why this moment is strong",
      "viralScore": 87
    }
  ]
}

Rules:
- Return ${input.maxClips} or fewer clips.
- Clip length must be between 15000 and 60000 milliseconds.
- Prefer complete sentences and self-contained ideas.
- Use transcript timestamps exactly when possible.
- Return JSON only. No markdown, no commentary.

Transcript:
${input.transcript}`;
}
