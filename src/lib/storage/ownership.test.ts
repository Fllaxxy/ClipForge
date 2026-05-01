import { describe, expect, it } from "vitest";
import { canAccessPrivateAsset } from "@/lib/storage/ownership";

describe("signed URL ownership checks", () => {
  it("allows owners and admins only", () => {
    expect(canAccessPrivateAsset({ sessionUserId: "u1", ownerId: "u1", role: "USER" })).toBe(true);
    expect(canAccessPrivateAsset({ sessionUserId: "u2", ownerId: "u1", role: "ADMIN" })).toBe(true);
    expect(canAccessPrivateAsset({ sessionUserId: "u2", ownerId: "u1", role: "USER" })).toBe(false);
  });
});
