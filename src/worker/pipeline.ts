import type { Clip, ProcessingJobType } from "@prisma/client";
import { createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { getPlanLimits } from "@/lib/billing/plans";
import { assertUsageAvailable, recordProcessingUsage } from "@/lib/billing/usage";
import { getDb } from "@/lib/db";
import { detectClipCandidates } from "@/lib/ai/detect-clips";
import { enqueueClipForgeJob, type ClipForgeJobData, type ClipForgeJobName } from "@/lib/queue";
import { createStorageKey, downloadToFile, uploadFile } from "@/lib/storage/s3";
import { generateAssSubtitles, generateSrtSubtitles } from "@/lib/subtitles/generate";
import { CaptionStyleSchema } from "@/lib/subtitles/types";
import { getTranscriptionProvider } from "@/lib/transcription/providers";
import { CropSettingsSchema } from "@/lib/video/crop";
import {
  ensureWorkDir,
  extractAudio,
  generateThumbnail,
  probeVideo,
  renderVerticalClip
} from "@/lib/video/ffmpeg";

const db = getDb();

async function appendLog(processingJobId: string, line: string) {
  const clean = line.slice(0, 1200);
  await db.processingJob.update({
    where: { id: processingJobId },
    data: {
      logs: {
        push: clean
      }
    }
  });
}

async function setJobRunning(processingJobId: string) {
  await db.processingJob.update({
    where: { id: processingJobId },
    data: {
      status: "RUNNING",
      attempts: { increment: 1 },
      progress: 5,
      error: null
    }
  });
}

async function setJobProgress(processingJobId: string, progress: number, log?: string) {
  await db.processingJob.update({
    where: { id: processingJobId },
    data: {
      progress: Math.max(0, Math.min(100, Math.round(progress))),
      ...(log ? { logs: { push: log.slice(0, 1200) } } : {})
    }
  });
}

async function setJobSucceeded(processingJobId: string, log?: string) {
  await db.processingJob.update({
    where: { id: processingJobId },
    data: {
      status: "SUCCEEDED",
      progress: 100,
      ...(log ? { logs: { push: log.slice(0, 1200) } } : {})
    }
  });
}

async function setJobFailed(processingJobId: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  await db.processingJob.update({
    where: { id: processingJobId },
    data: {
      status: "FAILED",
      error: message.slice(0, 4000),
      logs: {
        push: `Failed: ${message.slice(0, 1000)}`
      }
    }
  });
}

async function createNextJob(input: {
  projectId: string;
  userId: string;
  type: ProcessingJobType;
  name: ClipForgeJobName;
  priority?: number;
  extra?: Partial<ClipForgeJobData>;
}) {
  const processingJob = await db.processingJob.create({
    data: {
      projectId: input.projectId,
      type: input.type,
      status: "QUEUED",
      progress: 0
    }
  });

  await enqueueClipForgeJob(
    input.name,
    {
      projectId: input.projectId,
      userId: input.userId,
      processingJobId: processingJob.id,
      ...input.extra
    },
    { priority: input.priority ?? 2 }
  );

  return processingJob;
}

async function downloadRemoteVideo(sourceUrl: string, destination: string) {
  const response = await fetch(sourceUrl, {
    redirect: "follow",
    headers: {
      "user-agent": "ClipForge/1.0"
    }
  });

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download source URL: ${response.status}`);
  }

  await mkdir(path.dirname(destination), { recursive: true });
  await pipeline(Readable.fromWeb(response.body as unknown as import("node:stream/web").ReadableStream), createWriteStream(destination));
}

function filenameFromUrl(sourceUrl: string) {
  try {
    const parsed = new URL(sourceUrl);
    const filename = path.basename(parsed.pathname);
    return filename || "remote-video.mp4";
  } catch {
    return "remote-video.mp4";
  }
}

async function getSourceToLocal(projectId: string, storageKey: string) {
  const workDir = await ensureWorkDir(projectId);
  const localPath = path.join(workDir, "source-video");
  await downloadToFile(storageKey, localPath);
  return localPath;
}

export async function ingestVideo(data: ClipForgeJobData) {
  await setJobRunning(data.processingJobId);
  await db.project.update({
    where: { id: data.projectId },
    data: { status: "PROCESSING" }
  });

  const workDir = await ensureWorkDir(data.projectId);
  let storageKey = data.storageKey;
  let localSourcePath = path.join(workDir, "source-video");

  if (data.sourceUrl) {
    localSourcePath = path.join(workDir, filenameFromUrl(data.sourceUrl));
    await setJobProgress(data.processingJobId, 15, "Downloading remote video.");
    await downloadRemoteVideo(data.sourceUrl, localSourcePath);
    storageKey = createStorageKey(data.userId, data.projectId, `source/${path.basename(localSourcePath)}`);
    await uploadFile({
      key: storageKey,
      filePath: localSourcePath,
      contentType: "video/mp4"
    });
  } else if (storageKey) {
    await setJobProgress(data.processingJobId, 20, "Downloading uploaded source from storage.");
    localSourcePath = await getSourceToLocal(data.projectId, storageKey);
  } else {
    throw new Error("ingestVideo requires sourceUrl or storageKey.");
  }

  await setJobProgress(data.processingJobId, 40, "Probing source metadata.");
  const [probe, fileStats] = await Promise.all([probeVideo(localSourcePath), stat(localSourcePath)]);
  const usage = await assertUsageAvailable(data.userId, probe.durationSeconds);

  if (!usage.ok) {
    throw new Error(usage.error);
  }

  if (!storageKey) {
    throw new Error("Source storage key was not created.");
  }

  await db.sourceVideo.upsert({
    where: { projectId: data.projectId },
    create: {
      projectId: data.projectId,
      storageKey,
      originalFileUrl: `/api/projects/${data.projectId}/source`,
      durationSeconds: probe.durationSeconds,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      codec: probe.codec,
      sizeBytes: BigInt(fileStats.size),
      metadataJson: probe.raw as object
    },
    update: {
      storageKey,
      durationSeconds: probe.durationSeconds,
      width: probe.width,
      height: probe.height,
      fps: probe.fps,
      codec: probe.codec,
      sizeBytes: BigInt(fileStats.size),
      metadataJson: probe.raw as object
    }
  });

  await recordProcessingUsage(data.userId, data.projectId, probe.durationSeconds);
  await setJobSucceeded(data.processingJobId, "Source video ingested and probed.");
  await createNextJob({
    projectId: data.projectId,
    userId: data.userId,
    type: "EXTRACT_AUDIO",
    name: "extractAudio",
    extra: { storageKey }
  });
}

export async function extractProjectAudio(data: ClipForgeJobData) {
  await setJobRunning(data.processingJobId);
  const sourceVideo = await db.sourceVideo.findUniqueOrThrow({
    where: { projectId: data.projectId }
  });
  const workDir = await ensureWorkDir(data.projectId);
  const sourcePath = await getSourceToLocal(data.projectId, sourceVideo.storageKey);
  const audioPath = path.join(workDir, "audio.wav");

  await setJobProgress(data.processingJobId, 30, "Extracting mono 16kHz WAV audio.");
  await extractAudio({
    sourcePath,
    outputPath: audioPath,
    onLine: (line) => void appendLog(data.processingJobId, line)
  });

  const audioKey = createStorageKey(data.userId, data.projectId, "audio/source.wav");
  await uploadFile({
    key: audioKey,
    filePath: audioPath,
    contentType: "audio/wav"
  });

  await db.sourceVideo.update({
    where: { projectId: data.projectId },
    data: {
      metadataJson: {
        ...(typeof sourceVideo.metadataJson === "object" && sourceVideo.metadataJson ? sourceVideo.metadataJson : {}),
        audioStorageKey: audioKey
      }
    }
  });

  await setJobSucceeded(data.processingJobId, "Audio extracted.");
  await createNextJob({
    projectId: data.projectId,
    userId: data.userId,
    type: "TRANSCRIBE",
    name: "transcribeVideo"
  });
}

export async function transcribeVideo(data: ClipForgeJobData) {
  await setJobRunning(data.processingJobId);
  const sourceVideo = await db.sourceVideo.findUniqueOrThrow({
    where: { projectId: data.projectId },
    include: { project: true }
  });
  const metadata =
    typeof sourceVideo.metadataJson === "object" && sourceVideo.metadataJson
      ? (sourceVideo.metadataJson as Record<string, unknown>)
      : {};
  const audioStorageKey = metadata.audioStorageKey;
  if (typeof audioStorageKey !== "string") {
    throw new Error("Audio asset is missing from source video metadata.");
  }

  const workDir = await ensureWorkDir(data.projectId);
  const audioPath = path.join(workDir, "audio.wav");
  await downloadToFile(audioStorageKey, audioPath);
  const provider = getTranscriptionProvider();

  await setJobProgress(data.processingJobId, 35, `Transcribing with ${provider.name}.`);
  const segments = await provider.transcribe({
    audioPath,
    durationSeconds: sourceVideo.durationSeconds ?? 60,
    projectTitle: sourceVideo.project.title
  });

  await db.transcriptSegment.deleteMany({ where: { projectId: data.projectId } });
  await db.transcriptSegment.createMany({
    data: segments.map((segment) => ({
      projectId: data.projectId,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
      confidence: segment.confidence
    }))
  });

  await setJobSucceeded(data.processingJobId, `Saved ${segments.length} transcript segments.`);
  await createNextJob({
    projectId: data.projectId,
    userId: data.userId,
    type: "DETECT_CLIPS",
    name: "detectClips"
  });
}

export async function detectProjectClips(data: ClipForgeJobData) {
  await setJobRunning(data.processingJobId);
  const project = await db.project.findUniqueOrThrow({
    where: { id: data.projectId },
    include: {
      user: { include: { subscription: true } },
      sourceVideo: true,
      transcriptSegments: { orderBy: { startMs: "asc" } }
    }
  });

  if (!project.sourceVideo) {
    throw new Error("Source video is missing.");
  }

  await setJobProgress(data.processingJobId, 35, "Detecting high-retention clip candidates.");
  const candidates = await detectClipCandidates({
    segments: project.transcriptSegments,
    plan: project.user.subscription?.plan ?? "FREE",
    videoDurationMs: (project.sourceVideo.durationSeconds ?? 0) * 1000
  });

  await db.clip.deleteMany({ where: { projectId: data.projectId } });
  await db.clip.createMany({
    data: candidates.map((candidate) => ({
      projectId: data.projectId,
      title: candidate.title,
      hook: candidate.hook,
      reason: candidate.reason,
      startMs: candidate.startMs,
      endMs: candidate.endMs,
      durationMs: candidate.endMs - candidate.startMs,
      viralScore: candidate.viralScore,
      status: "QUEUED",
      captionStyleJson: {},
      cropJson: {}
    }))
  });

  await setJobSucceeded(data.processingJobId, `Created ${candidates.length} clips.`);
  await createNextJob({
    projectId: data.projectId,
    userId: data.userId,
    type: "RENDER_CLIPS",
    name: "renderClips"
  });
}

function clipTranscript(
  segments: Array<{ startMs: number; endMs: number; text: string }>,
  clip: Pick<Clip, "startMs" | "endMs">
) {
  return segments
    .filter((segment) => segment.endMs > clip.startMs && segment.startMs < clip.endMs)
    .map((segment) => ({
      startMs: Math.max(0, segment.startMs - clip.startMs),
      endMs: Math.min(clip.endMs - clip.startMs, segment.endMs - clip.startMs),
      text: segment.text
    }))
    .filter((segment) => segment.endMs > segment.startMs);
}

export async function renderProjectClips(data: ClipForgeJobData) {
  await setJobRunning(data.processingJobId);
  const project = await db.project.findUniqueOrThrow({
    where: { id: data.projectId },
    include: {
      user: { include: { subscription: true } },
      sourceVideo: true,
      clips: {
        where: data.clipId ? { id: data.clipId } : undefined,
        orderBy: { viralScore: "desc" }
      },
      transcriptSegments: { orderBy: { startMs: "asc" } }
    }
  });

  if (!project.sourceVideo) {
    throw new Error("Source video is missing.");
  }

  const plan = project.user.subscription?.plan ?? "FREE";
  const limits = getPlanLimits(plan);
  const workDir = await ensureWorkDir(data.projectId);
  const sourcePath = await getSourceToLocal(data.projectId, project.sourceVideo.storageKey);
  const clips = project.clips;

  if (!clips.length) {
    throw new Error("No clips are ready to render.");
  }

  for (const [index, clip] of clips.entries()) {
    await db.clip.update({
      where: { id: clip.id },
      data: { status: "RENDERING" }
    });

    const clipDir = path.join(workDir, "clips", clip.id);
    await mkdir(clipDir, { recursive: true });
    const style = CaptionStyleSchema.parse(clip.captionStyleJson ?? {});
    const crop = CropSettingsSchema.parse(clip.cropJson ?? {});
    const subtitleSegments = clipTranscript(project.transcriptSegments, clip);
    const ass = generateAssSubtitles({ segments: subtitleSegments, style });
    const srt = generateSrtSubtitles(subtitleSegments);
    const assPath = path.join(clipDir, "captions.ass");
    const srtPath = path.join(clipDir, "captions.srt");
    const outputPath = path.join(clipDir, "clip.mp4");
    const thumbnailPath = path.join(clipDir, "thumbnail.jpg");

    await writeFile(assPath, ass, "utf8");
    await writeFile(srtPath, srt, "utf8");

    await renderVerticalClip({
      sourcePath,
      outputPath,
      subtitlePath: assPath,
      startMs: clip.startMs,
      durationMs: clip.durationMs,
      crop,
      watermark: limits.watermark,
      onLine: (line) => void appendLog(data.processingJobId, `[${clip.id}] ${line}`)
    });

    await generateThumbnail({
      sourcePath,
      outputPath: thumbnailPath,
      timestampMs: clip.startMs + Math.floor(clip.durationMs / 2),
      crop
    });

    const baseKey = createStorageKey(data.userId, data.projectId, `clips/${clip.id}`);
    const outputKey = `${baseKey}/clip.mp4`;
    const thumbnailKey = `${baseKey}/thumbnail.jpg`;
    const assKey = `${baseKey}/captions.ass`;
    const srtKey = `${baseKey}/captions.srt`;
    const transcriptKey = `${baseKey}/transcript.txt`;

    await Promise.all([
      uploadFile({ key: outputKey, filePath: outputPath, contentType: "video/mp4" }),
      uploadFile({ key: thumbnailKey, filePath: thumbnailPath, contentType: "image/jpeg" }),
      uploadFile({ key: assKey, filePath: assPath, contentType: "text/x-ssa" }),
      uploadFile({ key: srtKey, filePath: srtPath, contentType: "text/plain" }),
      writeFile(path.join(clipDir, "transcript.txt"), subtitleSegments.map((segment) => segment.text).join("\n"), "utf8").then(
        () =>
          uploadFile({
            key: transcriptKey,
            filePath: path.join(clipDir, "transcript.txt"),
            contentType: "text/plain"
          })
      )
    ]);

    await db.clipAsset.deleteMany({ where: { clipId: clip.id } });
    await db.clipAsset.createMany({
      data: [
        { clipId: clip.id, type: "VIDEO", storageKey: outputKey, url: `/api/clips/${clip.id}/download` },
        {
          clipId: clip.id,
          type: "THUMBNAIL",
          storageKey: thumbnailKey,
          url: `/api/clips/${clip.id}/thumbnail`
        },
        { clipId: clip.id, type: "SUBTITLE", storageKey: assKey, metadataJson: { format: "ass" } },
        { clipId: clip.id, type: "SUBTITLE", storageKey: srtKey, metadataJson: { format: "srt" } },
        { clipId: clip.id, type: "TRANSCRIPT", storageKey: transcriptKey }
      ]
    });
    await db.clip.update({
      where: { id: clip.id },
      data: {
        status: "READY",
        outputUrl: `/api/clips/${clip.id}/download`,
        thumbnailUrl: `/api/clips/${clip.id}/thumbnail`
      }
    });

    await setJobProgress(
      data.processingJobId,
      10 + ((index + 1) / clips.length) * 85,
      `Rendered ${index + 1}/${clips.length} clips.`
    );
  }

  await db.project.update({
    where: { id: data.projectId },
    data: { status: "READY" }
  });
  await setJobSucceeded(data.processingJobId, "All clips rendered.");
}

export async function runPipelineJob(name: ClipForgeJobName, data: ClipForgeJobData) {
  try {
    switch (name) {
      case "ingestVideo":
        await ingestVideo(data);
        break;
      case "extractAudio":
        await extractProjectAudio(data);
        break;
      case "transcribeVideo":
        await transcribeVideo(data);
        break;
      case "detectClips":
        await detectProjectClips(data);
        break;
      case "renderClips":
        await renderProjectClips(data);
        break;
      default:
        throw new Error(`Unknown job ${name satisfies never}`);
    }
  } catch (error) {
    await setJobFailed(data.processingJobId, error);
    if (name !== "renderClips" || !data.clipId) {
      await db.project.update({
        where: { id: data.projectId },
        data: { status: "FAILED" }
      });
    }
    if (data.clipId) {
      await db.clip.update({
        where: { id: data.clipId },
        data: {
          status: "FAILED"
        }
      });
    }
    throw error;
  }
}
