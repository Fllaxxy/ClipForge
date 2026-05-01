import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getPlanLimits } from "@/lib/billing/plans";
import { urlInputSchema } from "@/lib/config";
import { getDb } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { enqueueClipForgeJob } from "@/lib/queue";
import { createStorageKey, uploadBuffer } from "@/lib/storage/s3";
import { sanitizeFilename, validateVideoFile } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = checkRateLimit(`upload:${session.user.id}`, 8, 60 * 60 * 1000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "Untitled project").trim().slice(0, 120);
  const urlValue = formData.get("url");
  const fileValue = formData.get("file");

  if (!(fileValue instanceof File) && !urlValue) {
    return NextResponse.json({ error: "Upload a file or paste a video URL." }, { status: 400 });
  }

  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true }
  });
  const limits = getPlanLimits(user?.subscription?.plan ?? "FREE");
  const project = await db.project.create({
    data: {
      userId: session.user.id,
      title: title || "Untitled project",
      status: "UPLOADED"
    }
  });

  let sourceUrl: string | undefined;
  let storageKey: string | undefined;

  if (fileValue instanceof File) {
    const validation = validateVideoFile({
      filename: fileValue.name,
      contentType: fileValue.type,
      size: fileValue.size
    });
    if (!validation.ok) {
      await db.project.delete({ where: { id: project.id } });
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const filename = sanitizeFilename(fileValue.name);
    storageKey = createStorageKey(session.user.id, project.id, `source/${filename}`);
    const buffer = Buffer.from(await fileValue.arrayBuffer());
    await uploadBuffer({
      key: storageKey,
      body: buffer,
      contentType: fileValue.type || "application/octet-stream",
      metadata: {
        originalFilename: filename
      }
    });
    await db.sourceVideo.create({
      data: {
        projectId: project.id,
        storageKey: storageKey!,
        originalFileUrl: `/api/projects/${project.id}/source`,
        sizeBytes: BigInt(fileValue.size)
      }
    });
  } else if (urlValue) {
    const parsedUrl = urlInputSchema.safeParse(String(urlValue));
    if (!parsedUrl.success) {
      await db.project.delete({ where: { id: project.id } });
      return NextResponse.json({ error: "Enter a valid http or https video URL." }, { status: 400 });
    }
    sourceUrl = parsedUrl.data;
  }

  const processingJob = await db.processingJob.create({
    data: {
      projectId: project.id,
      type: "INGEST_VIDEO",
      status: "QUEUED",
      progress: 0,
      logs: [`Queued with ${limits.label} plan limits.`]
    }
  });

  await enqueueClipForgeJob("ingestVideo", {
    projectId: project.id,
    userId: session.user.id,
    processingJobId: processingJob.id,
    sourceUrl,
    storageKey
  });

  return NextResponse.json({
    projectId: project.id,
    jobId: processingJob.id
  });
}
