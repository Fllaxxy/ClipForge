import { Queue, type JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { appConfig } from "@/lib/config";

export type ClipForgeJobName =
  | "ingestVideo"
  | "extractAudio"
  | "transcribeVideo"
  | "detectClips"
  | "renderClips";

export type ClipForgeJobData = {
  projectId: string;
  userId: string;
  processingJobId: string;
  sourceUrl?: string;
  storageKey?: string;
  clipId?: string;
  force?: boolean;
};

let redisConnection: IORedis | null = null;
let queue: Queue<ClipForgeJobData, unknown, ClipForgeJobName> | null = null;

export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(appConfig.redisUrl, {
      maxRetriesPerRequest: null
    });
  }
  return redisConnection;
}

export function getClipForgeQueue() {
  if (!queue) {
    queue = new Queue<ClipForgeJobData, unknown, ClipForgeJobName>(appConfig.queueName, {
      connection: getRedisConnection()
    });
  }
  return queue;
}

export function defaultJobOptions(priority = 2): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    priority,
    removeOnComplete: 200,
    removeOnFail: 500
  };
}

export async function enqueueClipForgeJob(
  name: ClipForgeJobName,
  data: ClipForgeJobData,
  options?: JobsOptions
) {
  return getClipForgeQueue().add(name, data, {
    ...defaultJobOptions(),
    ...options
  });
}
