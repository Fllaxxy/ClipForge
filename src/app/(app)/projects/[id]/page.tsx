import { notFound } from "next/navigation";
import { ProjectDetailClient } from "@/components/project-detail-client";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  const { id } = await params;
  const project = await getDb().project.findFirst({
    where: {
      id,
      ...(session!.user.role === "ADMIN" ? {} : { userId: session!.user.id })
    },
    include: {
      sourceVideo: true,
      processingJobs: { orderBy: { createdAt: "desc" } },
      clips: { orderBy: { viralScore: "desc" } }
    }
  });

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetailClient
      initialProject={{
        id: project.id,
        title: project.title,
        status: project.status,
        sourceVideo: project.sourceVideo
          ? {
              durationSeconds: project.sourceVideo.durationSeconds,
              width: project.sourceVideo.width,
              height: project.sourceVideo.height,
              fps: project.sourceVideo.fps,
              codec: project.sourceVideo.codec
            }
          : null,
        processingJobs: project.processingJobs.map((job) => ({
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          error: job.error,
          logs: job.logs
        })),
        clips: project.clips.map((clip) => ({
          id: clip.id,
          title: clip.title,
          hook: clip.hook,
          startMs: clip.startMs,
          endMs: clip.endMs,
          durationMs: clip.durationMs,
          viralScore: clip.viralScore,
          status: clip.status,
          thumbnailUrl: clip.thumbnailUrl,
          outputUrl: clip.outputUrl
        }))
      }}
    />
  );
}
