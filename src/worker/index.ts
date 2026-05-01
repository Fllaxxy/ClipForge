import { Worker } from "bullmq";
import { appConfig } from "@/lib/config";
import { getRedisConnection, type ClipForgeJobData, type ClipForgeJobName } from "@/lib/queue";
import { runPipelineJob } from "@/worker/pipeline";

const worker = new Worker<ClipForgeJobData, unknown, ClipForgeJobName>(
  appConfig.queueName,
  async (job) => {
    await runPipelineJob(job.name, job.data);
  },
  {
    connection: getRedisConnection(),
    concurrency: appConfig.workerConcurrency
  }
);

worker.on("completed", (job) => {
  console.log(`[worker] completed ${job.name} ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`[worker] failed ${job?.name} ${job?.id}`, error);
});

console.log(`[worker] ClipForge worker listening on ${appConfig.queueName}`);
