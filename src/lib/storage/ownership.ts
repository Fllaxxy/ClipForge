import type { ClipAssetType } from "@prisma/client";
import { getDb } from "@/lib/db";

export function canAccessPrivateAsset(input: {
  sessionUserId: string;
  ownerId: string;
  role?: "USER" | "ADMIN";
}) {
  return input.role === "ADMIN" || input.sessionUserId === input.ownerId;
}

export async function getOwnedClipAsset(input: {
  clipId: string;
  userId: string;
  role?: "USER" | "ADMIN";
  type?: ClipAssetType;
}) {
  const clip = await getDb().clip.findUnique({
    where: { id: input.clipId },
    include: {
      project: {
        select: {
          userId: true
        }
      },
      assets: input.type
        ? {
            where: { type: input.type },
            take: 1
          }
        : true
    }
  });

  if (!clip || !canAccessPrivateAsset({ sessionUserId: input.userId, ownerId: clip.project.userId, role: input.role })) {
    return null;
  }

  const assets = Array.isArray(clip.assets) ? clip.assets : [];
  return {
    clip,
    asset: assets[0] ?? null
  };
}
