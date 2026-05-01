import type { ProcessingJob, ProcessingJobType } from "@prisma/client";
import { defaultJobOptions, type ClipForgeJobData, type ClipForgeJobName } from "@/lib/queue";

export const PROCESSING_TYPE_TO_JOB_NAME: Record<ProcessingJobType, ClipForgeJobName> = {
  INGEST_VIDEO: "ingestVideo",
  EXTRACT_AUDIO: "extractAudio",
  TRANSCODE: "extractAudio",
  TRANSCRIBE: "transcribeVideo",
  DETECT_CLIPS: "detectClips",
  RENDER_CLIPS: "renderClips"
};

export function buildRetryJob(input: {
  job: Pick<ProcessingJob, "id" | "projectId" | "type" | "attempts">;
  userId: string;
  priority?: number;
}): {
  name: ClipForgeJobName;
  data: ClipForgeJobData;
  options: ReturnType<typeof defaultJobOptions>;
} {
  return {
    name: PROCESSING_TYPE_TO_JOB_NAME[input.job.type],
    data: {
      projectId: input.job.projectId,
      userId: input.userId,
      processingJobId: input.job.id,
      force: true
    },
    options: {
      ...defaultJobOptions(input.priority ?? 2),
      attempts: Math.max(1, 3 - input.job.attempts)
    }
  };
}
