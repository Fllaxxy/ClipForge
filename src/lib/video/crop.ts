import { z } from "zod";

export const CropSettingsSchema = z.object({
  mode: z.enum(["center", "top", "bottom", "custom"]).default("center"),
  x: z.coerce.number().min(0).max(1).default(0.5),
  y: z.coerce.number().min(0).max(1).default(0.5)
});

export type CropSettings = z.infer<typeof CropSettingsSchema>;

export const DEFAULT_CROP: CropSettings = CropSettingsSchema.parse({});

export function buildVerticalCropFilter(input: Partial<CropSettings> = {}) {
  const crop = CropSettingsSchema.parse({ ...DEFAULT_CROP, ...input });
  const x =
    crop.mode === "custom"
      ? `min(max((iw-1080)*${crop.x.toFixed(4)},0),iw-1080)`
      : "max((iw-1080)/2,0)";
  const y =
    crop.mode === "top"
      ? "0"
      : crop.mode === "bottom"
        ? "max(ih-1920,0)"
        : crop.mode === "custom"
          ? `min(max((ih-1920)*${crop.y.toFixed(4)},0),ih-1920)`
          : "max((ih-1920)/2,0)";

  return `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:${x}:${y},setsar=1`;
}
