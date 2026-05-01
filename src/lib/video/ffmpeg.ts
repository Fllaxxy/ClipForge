import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "@/lib/config";
import { buildVerticalCropFilter, type CropSettings } from "@/lib/video/crop";

export type VideoProbe = {
  durationSeconds: number;
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  raw: unknown;
};

export async function ensureWorkDir(projectId: string) {
  const dir = path.join(appConfig.tempDir, projectId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function runProcess(
  command: string,
  args: string[],
  options: {
    onLine?: (line: string) => void;
    cwd?: string;
  } = {}
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    const handle = (chunk: Buffer, stream: "stdout" | "stderr") => {
      const text = chunk.toString();
      if (stream === "stdout") {
        stdout += text;
      } else {
        stderr += text;
      }
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => options.onLine?.(line));
    };

    child.stdout.on("data", (chunk: Buffer) => handle(chunk, "stdout"));
    child.stderr.on("data", (chunk: Buffer) => handle(chunk, "stderr"));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} exited with ${code}: ${stderr.slice(-4000)}`));
      }
    });
  });
}

function parseFps(value?: string) {
  if (!value || value === "0/0") return undefined;
  const [numerator, denominator] = value.split("/").map(Number);
  if (!denominator) return numerator;
  return Math.round((numerator / denominator) * 100) / 100;
}

export async function probeVideo(filePath: string): Promise<VideoProbe> {
  const { stdout } = await runProcess(appConfig.ffprobePath, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    filePath
  ]);
  const raw = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }>;
  };
  const video = raw.streams?.find((stream) => stream.codec_type === "video");

  return {
    durationSeconds: Math.ceil(Number(raw.format?.duration ?? 0)),
    width: video?.width,
    height: video?.height,
    fps: parseFps(video?.avg_frame_rate ?? video?.r_frame_rate),
    codec: video?.codec_name,
    raw
  };
}

export async function extractAudio(input: {
  sourcePath: string;
  outputPath: string;
  onLine?: (line: string) => void;
}) {
  await runProcess(
    appConfig.ffmpegPath,
    [
      "-y",
      "-i",
      input.sourcePath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-acodec",
      "pcm_s16le",
      input.outputPath
    ],
    { onLine: input.onLine }
  );
}

function escapeFilterPath(filePath: string) {
  return filePath.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function buildVideoFilter(input: {
  subtitlePath?: string;
  crop?: Partial<CropSettings>;
  watermark?: boolean;
}) {
  const filters = [buildVerticalCropFilter(input.crop)];
  if (input.subtitlePath) {
    filters.push(`subtitles='${escapeFilterPath(input.subtitlePath)}'`);
  }
  if (input.watermark) {
    filters.push(
      "drawtext=text='ClipForge':x=w-tw-60:y=h-th-86:fontsize=32:fontcolor=white@0.82:box=1:boxcolor=black@0.38:boxborderw=12"
    );
  }
  return filters.join(",");
}

export async function renderVerticalClip(input: {
  sourcePath: string;
  outputPath: string;
  subtitlePath: string;
  startMs: number;
  durationMs: number;
  crop?: Partial<CropSettings>;
  watermark?: boolean;
  onLine?: (line: string) => void;
}) {
  await runProcess(
    appConfig.ffmpegPath,
    [
      "-y",
      "-ss",
      (input.startMs / 1000).toFixed(3),
      "-i",
      input.sourcePath,
      "-t",
      (input.durationMs / 1000).toFixed(3),
      "-vf",
      buildVideoFilter({
        subtitlePath: input.subtitlePath,
        crop: input.crop,
        watermark: input.watermark
      }),
      "-c:v",
      "libx264",
      "-preset",
      process.env.FFMPEG_PRESET ?? "veryfast",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      "6000k",
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      "-movflags",
      "+faststart",
      input.outputPath
    ],
    { onLine: input.onLine }
  );
}

export async function generateThumbnail(input: {
  sourcePath: string;
  outputPath: string;
  timestampMs: number;
  crop?: Partial<CropSettings>;
}) {
  await runProcess(appConfig.ffmpegPath, [
    "-y",
    "-ss",
    (input.timestampMs / 1000).toFixed(3),
    "-i",
    input.sourcePath,
    "-frames:v",
    "1",
    "-vf",
    buildVerticalCropFilter(input.crop),
    "-q:v",
    "2",
    input.outputPath
  ]);
}
