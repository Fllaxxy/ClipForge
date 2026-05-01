import { CreditCard, Gauge, ShieldCheck } from "lucide-react";
import { CheckoutButton, PortalButton } from "@/components/billing-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getCurrentSession } from "@/lib/auth";
import { getUsageSummary } from "@/lib/billing/usage";
import { getDb } from "@/lib/db";
import { formatMinutes } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await getCurrentSession();
  const [usage, user] = await Promise.all([
    getUsageSummary(session!.user.id),
    getDb().user.findUnique({
      where: { id: session!.user.id },
      include: { subscription: true }
    })
  ]);
  const usagePercent = Math.min(100, (usage.usedSeconds / usage.limits.monthlySeconds) * 100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Billing and settings</h1>
        <p className="mt-2 text-muted-foreground">Manage plan limits, subscription status, and usage.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Current plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge>{usage.limits.label}</Badge>
            <p className="mt-4 text-sm text-muted-foreground">
              {usage.limits.watermark ? "Exports include a ClipForge watermark." : "Watermark-free exports are enabled."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Monthly minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMinutes(usage.remainingSeconds)}</div>
            <Progress className="mt-4" value={usagePercent} />
            <p className="mt-2 text-xs text-muted-foreground">
              Resets {usage.resetAt.toLocaleDateString()} with {formatMinutes(usage.limits.monthlySeconds)} total.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Stripe status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{user?.subscription?.status ?? "active"}</p>
            <div className="mt-4">
              <PortalButton />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upgrade plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">Creator</h2>
            <p className="mt-2 text-sm text-muted-foreground">300 minutes/month, 20 clips/project, no watermark.</p>
            <div className="mt-4">
              <CheckoutButton plan="CREATOR">Upgrade to Creator</CheckoutButton>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">Pro</h2>
            <p className="mt-2 text-sm text-muted-foreground">1500 minutes/month, priority queue, batch processing.</p>
            <div className="mt-4">
              <CheckoutButton plan="PRO">Upgrade to Pro</CheckoutButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
