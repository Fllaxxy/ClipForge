import path from "node:path";
import { fileUploadConfig } from "@/lib/config";

export function sanitizeFilename(filename: string) {
  const parsed = path.parse(filename);
  const safeBase = parsed.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const safeExt = parsed.ext.toLowerCase();
  return `${safeBase || "video"}${safeExt}`;
}

export function validateVideoFile(input: {
  filename: string;
  contentType: string;
  size: number;
  maxBytes?: number;
}) {
  const extension = path.extname(input.filename).toLowerCase();
  const maxBytes = input.maxBytes ?? fileUploadConfig.maxBytes;

  if (!fileUploadConfig.allowedExtensions.includes(extension)) {
    return { ok: false as const, error: "Upload an mp4, mov, mkv, or webm video." };
  }

  if (!fileUploadConfig.allowedMimeTypes.includes(input.contentType || "application/octet-stream")) {
    return { ok: false as const, error: "That file type is not accepted." };
  }

  if (input.size <= 0) {
    return { ok: false as const, error: "The uploaded file is empty." };
  }

  if (input.size > maxBytes) {
    return {
      ok: false as const,
      error: `The file is larger than the configured ${Math.floor(maxBytes / 1024 / 1024)} MB limit.`
    };
  }

  return { ok: true as const };
}
