import { z } from "zod";

export const fileUploadConfig = {
  maxBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 1024 * 1024 * 1024),
  allowedExtensions: [".mp4", ".mov", ".mkv", ".webm"],
  allowedMimeTypes: [
    "video/mp4",
    "video/quicktime",
    "video/x-matroska",
    "video/webm",
    "application/octet-stream"
  ]
};

export const storageConfig = {
  bucket: process.env.S3_BUCKET ?? "clipforge",
  region: process.env.S3_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
};

export const appConfig = {
  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.RENDER_EXTERNAL_URL ??
    "http://localhost:3000",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  tempDir: process.env.CLIPFORGE_TMP_DIR ?? "/tmp/clipforge",
  ffmpegPath: process.env.FFMPEG_PATH ?? "ffmpeg",
  ffprobePath: process.env.FFPROBE_PATH ?? "ffprobe",
  queueName: process.env.CLIPFORGE_QUEUE_NAME ?? "clipforge",
  workerConcurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
  aiProvider: process.env.AI_PROVIDER ?? "mock",
  transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER ?? "mock"
};

export const urlInputSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Only http and https URLs are supported."
  });
