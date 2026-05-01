import { z } from "zod";

export const AiClipSchema = z.object({
  startMs: z.coerce.number().int().min(0),
  endMs: z.coerce.number().int().min(1),
  title: z.string().trim().min(3).max(120),
  hook: z.string().trim().min(3).max(180),
  reason: z.string().trim().min(3).max(500),
  viralScore: z.coerce.number().int().min(0).max(100)
});

export const AiClipDetectionResponseSchema = z.object({
  clips: z.array(AiClipSchema).min(1).max(30)
});

export type AiClipDetectionResponse = z.infer<typeof AiClipDetectionResponseSchema>;

export function extractJsonObject(raw: string) {
  const withoutFence = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return withoutFence;
  }

  return withoutFence.slice(start, end + 1);
}

export function parseClipDetectionJson(raw: string) {
  const json = extractJsonObject(raw)
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");
  const parsed = JSON.parse(json) as unknown;
  return AiClipDetectionResponseSchema.parse(parsed);
}
