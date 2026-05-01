import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getOwnedClipAsset } from "@/lib/storage/ownership";
import { getSignedDownloadUrl } from "@/lib/storage/s3";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await getOwnedClipAsset({
    clipId: id,
    userId: session.user.id,
    role: session.user.role,
    type: "THUMBNAIL"
  });

  if (!result?.asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedDownloadUrl({
    key: result.asset.storageKey,
    contentType: "image/jpeg"
  });

  return NextResponse.redirect(url);
}
