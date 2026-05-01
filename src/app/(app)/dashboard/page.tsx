import Link from "next/link";
import { Clock, Film, Gauge, Upload } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { getUsageSummary } from "@/lib/billing/usage";
import { getDb } from "@/lib/db";
import { formatMinutes } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const userId = session!.user.id;
  const [usage, projects] = await Promise.all([
    getUsageSummary(userId),
    getDb().project.findMany({
      where: { userId },
      include: {
        sourceVideo: true,
        clips: true,
        processingJobs: { orderBy: { createdAt: "desc" }, take: 1 }
      },
      orderBy: { createdAt: "desc" },
      take: 8
    })
  ]);
  const usagePercent = Math.min(100, (usage.usedSeconds / usage.limits.monthlySeconds) * 100);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Badge className="mb-3">{usage.limits.label} plan</Badge>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Track projects, processing status, and monthly minutes.</p>
        </div>
        <Button asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload video
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Remaining minutes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{formatMinutes(usage.remainingSeconds)}</div>
            <Progress className="mt-4" value={usagePercent} />
            <p className="mt-2 text-xs text-muted-foreground">
              {formatMinutes(usage.usedSeconds)} used of {formatMinutes(usage.limits.monthlySeconds)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              Recent projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{projects.length}</div>
            <p className="mt-2 text-sm text-muted-foreground">Latest uploads in your workspace</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Processing status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {projects.filter((project) => project.status === "PROCESSING").length}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Projects currently in the worker queue</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length ? (
            <div className="divide-y divide-border">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="grid gap-4 py-4 hover:bg-muted/30 sm:grid-cols-[1fr_140px_140px_140px]"
                >
                  <div>
                    <p className="font-medium">{project.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.sourceVideo?.durationSeconds
                        ? formatMinutes(project.sourceVideo.durationSeconds)
                        : "Waiting for metadata"}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                  <p className="text-sm text-muted-foreground">{project.clips.length} clips</p>
                  <p className="text-sm text-muted-foreground">
                    {project.processingJobs[0]?.progress ?? 0}% latest job
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
              <Film className="h-10 w-10 text-primary" />
              <h2 className="mt-4 text-xl font-semibold">No projects yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Upload a long-form video or paste a URL and ClipForge will create short-form clips automatically.
              </p>
              <Button asChild className="mt-6">
                <Link href="/upload">Upload your first video</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
