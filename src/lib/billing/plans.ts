import type { Plan } from "@prisma/client";

export type PlanLimits = {
  label: string;
  monthlySeconds: number;
  clipsPerProject: number;
  watermark: boolean;
  priority: number;
  stripePriceEnv?: string;
  batchProcessing: boolean;
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    label: "Free",
    monthlySeconds: 30 * 60,
    clipsPerProject: 3,
    watermark: true,
    priority: 3,
    batchProcessing: false
  },
  CREATOR: {
    label: "Creator",
    monthlySeconds: 300 * 60,
    clipsPerProject: 20,
    watermark: false,
    priority: 2,
    stripePriceEnv: "STRIPE_CREATOR_PRICE_ID",
    batchProcessing: false
  },
  PRO: {
    label: "Pro",
    monthlySeconds: 1500 * 60,
    clipsPerProject: 20,
    watermark: false,
    priority: 1,
    stripePriceEnv: "STRIPE_PRO_PRICE_ID",
    batchProcessing: true
  }
};

export function getPlanLimits(plan: Plan | null | undefined) {
  return PLAN_LIMITS[plan ?? "FREE"];
}

export function getStripePriceId(plan: Plan) {
  const envKey = PLAN_LIMITS[plan].stripePriceEnv;
  return envKey ? process.env[envKey] : undefined;
}
