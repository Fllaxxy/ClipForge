import type { Plan, UsageLedger } from "@prisma/client";
import { getDb } from "@/lib/db";
import { getPlanLimits } from "@/lib/billing/plans";

export function getMonthlyWindow(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  };
}

export function calculateMonthlyUsage(
  entries: Array<Pick<UsageLedger, "type" | "amount" | "unit" | "createdAt">>,
  now = new Date()
) {
  const { start, end } = getMonthlyWindow(now);
  return entries
    .filter((entry) => entry.type === "processing_seconds")
    .filter((entry) => entry.createdAt >= start && entry.createdAt < end)
    .reduce((total, entry) => {
      if (entry.unit === "seconds") {
        return total + entry.amount;
      }
      if (entry.unit === "minutes") {
        return total + entry.amount * 60;
      }
      return total;
    }, 0);
}

export async function getUsageSummary(userId: string) {
  const db = getDb();
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  const plan: Plan = user?.subscription?.plan ?? "FREE";
  const limits = getPlanLimits(plan);
  const { start, end } = getMonthlyWindow();
  const rows = await db.usageLedger.findMany({
    where: {
      userId,
      type: "processing_seconds",
      createdAt: {
        gte: start,
        lt: end
      }
    }
  });
  const usedSeconds = calculateMonthlyUsage(rows);

  return {
    plan,
    limits,
    usedSeconds,
    remainingSeconds: Math.max(0, limits.monthlySeconds - usedSeconds),
    resetAt: end
  };
}

export async function assertUsageAvailable(userId: string, requestedSeconds: number) {
  const summary = await getUsageSummary(userId);
  if (requestedSeconds > summary.remainingSeconds) {
    return {
      ok: false as const,
      summary,
      error: `This video needs ${Math.ceil(requestedSeconds / 60)} minutes, but your plan has ${Math.ceil(
        summary.remainingSeconds / 60
      )} minutes left this month.`
    };
  }

  return { ok: true as const, summary };
}

export async function recordProcessingUsage(userId: string, projectId: string, seconds: number) {
  return getDb().usageLedger.create({
    data: {
      userId,
      projectId,
      type: "processing_seconds",
      amount: Math.ceil(seconds),
      unit: "seconds"
    }
  });
}
