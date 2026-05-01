import { describe, expect, it } from "vitest";
import { calculateMonthlyUsage } from "@/lib/billing/usage";

describe("usage limit calculation", () => {
  it("counts only processing seconds inside the current month", () => {
    const now = new Date("2026-05-20T12:00:00Z");
    const used = calculateMonthlyUsage(
      [
        { type: "processing_seconds", amount: 120, unit: "seconds", createdAt: new Date("2026-05-01T00:00:00Z") },
        { type: "processing_seconds", amount: 2, unit: "minutes", createdAt: new Date("2026-05-10T00:00:00Z") },
        { type: "processing_seconds", amount: 999, unit: "seconds", createdAt: new Date("2026-04-30T23:59:59Z") },
        { type: "download", amount: 999, unit: "seconds", createdAt: new Date("2026-05-10T00:00:00Z") }
      ],
      now
    );

    expect(used).toBe(240);
  });
});
