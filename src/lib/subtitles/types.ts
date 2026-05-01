import { z } from "zod";

export const CaptionStyleSchema = z.object({
  fontSize: z.coerce.number().int().min(36).max(104).default(72),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ffffff"),
  highlightColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#facc15"),
  strokeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#000000"),
  uppercase: z.boolean().default(true),
  wordsPerCaptionChunk: z.coerce.number().int().min(1).max(8).default(4),
  position: z.enum(["top", "center", "lower-third"]).default("lower-third")
});

export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

export const DEFAULT_CAPTION_STYLE: CaptionStyle = CaptionStyleSchema.parse({});
