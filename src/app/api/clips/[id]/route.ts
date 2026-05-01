import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { validateClipBoundary } from "@/lib/clips/boundaries";
import { getDb } from "@/lib/db";
import { CaptionStyleSchema } from "@/lib/subtitles/types";
import { CropSettingsSchema } from "@/lib/video/crop";

const updateClipSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  hook: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  startMs: z.coerce.number().int().min(0).optional(),
  endMs: z.coerce.number().int().min(1).optional(),
  captionStyle: CaptionStyleSchema.partial().optional(),
  crop: CropSettingsSchema.partial().optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = updateClipSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid clip update." }, { status: 400 });
  }

  const clip = await getDb().clip.findFirst({
    where: {
      id,
      project: {
        ...(session.user.role === "ADMIN" ? {} : { userId: session.user.id })
      }
    }
  });

  if (!clip) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextStart = parsed.data.startMs ?? clip.startMs;
  const nextEnd = parsed.data.endMs ?? clip.endMs;
  if (!validateClipBoundary({ startMs: nextStart, endMs: nextEnd })) {
    return NextResponse.json({ error: "Clips must be between 15 and 60 seconds." }, { status: 400 });
  }

  const updated = await getDb().clip.update({
    where: { id },
    data: {
      title: parsed.data.title,
      hook: parsed.data.hook,
      description: parsed.data.description,
      startMs: nextStart,
      endMs: nextEnd,
      durationMs: nextEnd - nextStart,
      captionStyleJson: parsed.data.captionStyle
        ? {
            ...(typeof clip.captionStyleJson === "object" && clip.captionStyleJson
              ? clip.captionStyleJson
              : {}),
            ...parsed.data.captionStyle
          }
        : undefined,
      cropJson: parsed.data.crop
        ? {
            ...(typeof clip.cropJson === "object" && clip.cropJson ? clip.cropJson : {}),
            ...parsed.data.crop
          }
        : undefined,
      status: clip.status === "READY" ? "QUEUED" : clip.status
    }
  });

  return NextResponse.json(updated);
}
