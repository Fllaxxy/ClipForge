import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPlanLimits } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { enqueueClipForgeJob } from "@/lib/queue";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const clip = await getDb().clip.findFirst({
    where: {
      id,
      project: {
        ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id })
      }
    },
    include: {
      project: {
        include: {
          user: {
            include: { subscription: true }
          }
        }
      }
    }
  });

  if (!clip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const processingJob = await getDb().processingJob.create({
    data: {
      projectId: clip.projectId,
      type: "RENDER_CLIPS",
      status: "QUEUED",
      progress: 0,
      logs: [`Queued re-render for clip ${clip.id}.`]
    }
  });
  const limits = getPlanLimits(clip.project.user.subscription?.plan ?? "FREE");

  await getDb().clip.update({
    where: { id: clip.id },
    data: { status: "QUEUED" }
  });

  await enqueueClipForgeJob(
    "renderClips",
    {
      projectId: clip.projectId,
      userId: clip.project.userId,
      processingJobId: processingJob.id,
      clipId: clip.id,
      force: true
    },
    { priority: limits.priority }
  );

  return NextResponse.json({ jobId: processingJob.id });
}
