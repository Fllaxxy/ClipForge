import { readFile } from "node:fs/promises";
import { runProcess } from "@/lib/video/ffmpeg";
import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptSegmentResult
} from "@/lib/transcription/types";

const mockPhrases = [
  "Here is the mistake almost everyone makes when they try to grow.",
  "The surprising part is that the answer is much simpler than it looks.",
  "If you do this one thing consistently, the result compounds very fast.",
  "I used to believe the opposite, but this completely changed my workflow.",
  "The key question is not how much content you make, it is where attention spikes.",
  "That is the exact moment viewers decide whether they keep watching or leave.",
  "So the practical advice is to isolate the conflict, the payoff, and the useful turn."
];

class MockTranscriptionProvider implements TranscriptionProvider {
  name = "mock";

  async transcribe(input: TranscriptionInput) {
    const durationMs = Math.max(60_000, Math.round(input.durationSeconds * 1000));
    const stepMs = 6_000;
    const segments: TranscriptSegmentResult[] = [];

    for (let startMs = 0, index = 0; startMs < durationMs; startMs += stepMs, index += 1) {
      segments.push({
        startMs,
        endMs: Math.min(durationMs, startMs + stepMs),
        text: mockPhrases[index % mockPhrases.length],
        confidence: 0.92
      });
    }

    return segments;
  }
}

class LocalWhisperProvider implements TranscriptionProvider {
  name = "local-whisper";

  async transcribe(input: TranscriptionInput) {
    const command = process.env.LOCAL_WHISPER_COMMAND ?? "whisper";
    const args = (process.env.LOCAL_WHISPER_ARGS ?? "--output_format json --word_timestamps False")
      .split(/\s+/)
      .filter(Boolean)
      .concat(input.audioPath);
    const { stdout } = await runProcess(command, args);
    const parsed = JSON.parse(stdout) as {
      segments?: Array<{ start: number; end: number; text: string; avg_logprob?: number }>;
    };

    return (parsed.segments ?? []).map((segment) => ({
      startMs: Math.round(segment.start * 1000),
      endMs: Math.round(segment.end * 1000),
      text: segment.text.trim(),
      confidence: typeof segment.avg_logprob === "number" ? Math.max(0, Math.min(1, segment.avg_logprob + 1)) : undefined
    }));
  }
}

class OpenAICompatibleTranscriptionProvider implements TranscriptionProvider {
  name = "openai-compatible";

  async transcribe(input: TranscriptionInput) {
    const apiKey = process.env.OPENAI_API_KEY ?? process.env.TRANSCRIPTION_API_KEY;
    const baseUrl = (
      process.env.OPENAI_BASE_URL ??
      process.env.TRANSCRIPTION_BASE_URL ??
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");
    const model = process.env.TRANSCRIPTION_MODEL ?? "whisper-1";

    if (!apiKey) {
      throw new Error("OPENAI_API_KEY or TRANSCRIPTION_API_KEY is required.");
    }

    const form = new FormData();
    form.set("model", model);
    form.set("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    const buffer = await readFile(input.audioPath);
    form.set("file", new Blob([buffer], { type: "audio/wav" }), "audio.wav");

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Transcription provider failed with ${response.status}: ${await response.text()}`);
    }

    const json = (await response.json()) as {
      segments?: Array<{ start: number; end: number; text: string; avg_logprob?: number }>;
      text?: string;
    };

    if (json.segments?.length) {
      return json.segments.map((segment) => ({
        startMs: Math.round(segment.start * 1000),
        endMs: Math.round(segment.end * 1000),
        text: segment.text.trim(),
        confidence:
          typeof segment.avg_logprob === "number"
            ? Math.max(0, Math.min(1, segment.avg_logprob + 1))
            : undefined
      }));
    }

    return [
      {
        startMs: 0,
        endMs: Math.round(input.durationSeconds * 1000),
        text: json.text ?? "",
        confidence: 0.8
      }
    ];
  }
}

export function getTranscriptionProvider(): TranscriptionProvider {
  switch (process.env.TRANSCRIPTION_PROVIDER ?? "mock") {
    case "local-whisper":
      return new LocalWhisperProvider();
    case "openai-compatible":
      return new OpenAICompatibleTranscriptionProvider();
    default:
      return new MockTranscriptionProvider();
  }
}
