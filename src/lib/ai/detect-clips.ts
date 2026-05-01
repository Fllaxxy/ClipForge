import type { ClipCandidate, TranscriptBoundary } from "@/lib/clips/boundaries";
import { normalizeClipCandidates } from "@/lib/clips/boundaries";
import { getPlanLimits } from "@/lib/billing/plans";
import { buildClipDetectionPrompt } from "@/lib/ai/prompt";
import { heuristicDetectClips } from "@/lib/ai/heuristic";
import { parseClipDetectionJson } from "@/lib/ai/schemas";
import type { Plan } from "@prisma/client";

function transcriptToPrompt(segments: TranscriptBoundary[]) {
  return segments
    .map((segment) => `[${segment.startMs}-${segment.endMs}] ${segment.text}`)
    .join("\n")
    .slice(0, 80_000);
}

async function detectWithOpenAICompatible(input: {
  segments: TranscriptBoundary[];
  maxClips: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL ?? process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/$/,
    ""
  );
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or AI_API_KEY is required for the OpenAI-compatible clip provider.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return valid JSON only. Do not include markdown."
        },
        {
          role: "user",
          content: buildClipDetectionPrompt({
            maxClips: input.maxClips,
            transcript: transcriptToPrompt(input.segments)
          })
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider failed with ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI provider returned no content.");
  }

  return parseClipDetectionJson(content).clips;
}

export async function detectClipCandidates(input: {
  segments: TranscriptBoundary[];
  plan: Plan;
  videoDurationMs?: number;
}) {
  const maxClips = getPlanLimits(input.plan).clipsPerProject;
  let candidates: ClipCandidate[];

  if ((process.env.AI_PROVIDER ?? "mock") === "openai-compatible") {
    try {
      candidates = await detectWithOpenAICompatible({
        segments: input.segments,
        maxClips
      });
    } catch {
      candidates = heuristicDetectClips(input.segments, maxClips);
    }
  } else {
    candidates = heuristicDetectClips(input.segments, maxClips);
  }

  return normalizeClipCandidates({
    candidates,
    segments: input.segments,
    maxClips,
    videoDurationMs: input.videoDurationMs
  });
}
