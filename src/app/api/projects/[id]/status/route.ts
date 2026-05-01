import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await getDb().project.findFirst({
    where: {
      id,
      ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id })
    },
    include: {
      sourceVideo: true,
      processingJobs: { orderBy: { createdAt: "desc" } },
      clips: { orderBy: { viralScore: "desc" } }
    }
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...project,
    sourceVideo: project.sourceVideo
      ? {
          ...project.sourceVideo,
          sizeBytes: project.sourceVideo.sizeBytes?.toString() ?? null
        }
      : null
  });
}
