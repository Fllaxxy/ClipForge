import { notFound } from "next/navigation";
import { ClipEditor } from "@/components/clip-editor";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function ClipEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  const { id } = await params;
  const clip = await getDb().clip.findFirst({
    where: {
      id,
      project: {
        ...(session!.user.role === "ADMIN" ? {} : { userId: session!.user.id })
      }
    },
    include: {
      project: {
        include: {
          sourceVideo: true,
          transcriptSegments: { orderBy: { startMs: "asc" } }
        }
      }
    }
  });

  if (!clip || !clip.project.sourceVideo) {
    notFound();
  }

  return (
    <ClipEditor
      clip={{
        id: clip.id,
        title: clip.title,
        hook: clip.hook,
        description: clip.description,
        startMs: clip.startMs,
        endMs: clip.endMs,
        durationMs: clip.durationMs,
        viralScore: clip.viralScore,
        reason: clip.reason,
        status: clip.status,
        outputUrl: clip.outputUrl,
        captionStyleJson: clip.captionStyleJson as Record<string, unknown> | null,
        cropJson: clip.cropJson as Record<string, unknown> | null
      }}
      sourceDurationMs={(clip.project.sourceVideo.durationSeconds ?? 60) * 1000}
      segments={clip.project.transcriptSegments}
    />
  );
}
