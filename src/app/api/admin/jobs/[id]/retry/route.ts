import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPlanLimits } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { buildRetryJob } from "@/lib/jobs/retry";
import { enqueueClipForgeJob } from "@/lib/queue";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { id } = await context.params;
  const job = await getDb().processingJob.findUnique({
    where: { id },
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

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limits = getPlanLimits(job.project.user.subscription?.plan ?? "FREE");
  const retry = buildRetryJob({
    job,
    userId: job.project.userId,
    priority: limits.priority
  });

  await getDb().processingJob.update({
    where: { id },
    data: {
      status: "QUEUED",
      progress: 0,
      error: null,
      logs: {
        push: `Retry queued by ${session.user.email ?? session.user.id}.`
      }
    }
  });

  await enqueueClipForgeJob(retry.name, retry.data, retry.options);

  return NextResponse.json({ jobId: id, queued: true });
}
