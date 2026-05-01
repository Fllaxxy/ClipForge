import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getSignedDownloadUrl } from "@/lib/storage/s3";

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
    include: { sourceVideo: true }
  });

  if (!project?.sourceVideo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedDownloadUrl({
    key: project.sourceVideo.storageKey,
    filename: `${project.title}.mp4`,
    expiresIn: 10 * 60
  });

  return NextResponse.redirect(url);
}
