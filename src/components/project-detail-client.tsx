"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Download, Edit3, RefreshCw } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, formatMinutes } from "@/lib/utils";

type ProjectStatusPayload = {
  id: string;
  title: string;
  status: string;
  sourceVideo: null | {
    durationSeconds: number | null;
    width: number | null;
    height: number | null;
    fps: number | null;
    codec: string | null;
  };
  processingJobs: Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    error: string | null;
    logs: string[];
  }>;
  clips: Array<{
    id: string;
    title: string;
    hook: string;
    startMs: number;
    endMs: number;
    durationMs: number;
    viralScore: number;
    status: string;
    thumbnailUrl: string | null;
    outputUrl: string | null;
  }>;
};

export function ProjectDetailClient({ initialProject }: { initialProject: ProjectStatusPayload }) {
  const [project, setProject] = useState(initialProject);
  const shouldPoll = useMemo(
    () =>
      project.status === "PROCESSING" ||
      project.processingJobs.some((job) => ["QUEUED", "RUNNING"].includes(job.status)) ||
      project.clips.some((clip) => ["QUEUED", "RENDERING"].includes(clip.status)),
    [project]
  );

  useEffect(() => {
    if (!shouldPoll) return;
    const timer = window.setInterval(async () => {
      const response = await fetch(`/api/projects/${project.id}/status`, { cache: "no-store" });
      if (response.ok) {
        setProject((await response.json()) as ProjectStatusPayload);
      }
    }, 3500);
    return () => window.clearInterval(timer);
  }, [project.id, shouldPoll]);

  const latestJob = project.processingJobs[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <StatusBadge status={project.status} />
          <h1 className="mt-3 text-3xl font-semibold">{project.title}</h1>
          <p className="mt-2 text-muted-foreground">
            {project.sourceVideo?.durationSeconds
              ? `${formatMinutes(project.sourceVideo.durationSeconds)} source, ${project.sourceVideo.width}x${project.sourceVideo.height}`
              : "Waiting for source metadata"}
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/upload">Upload another</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Generated clips</CardTitle>
          </CardHeader>
          <CardContent>
            {project.clips.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {project.clips.map((clip) => (
                  <Card key={clip.id} className="overflow-hidden">
                    <div className="aspect-[9/16] bg-secondary">
                      {clip.thumbnailUrl ? (
                        <Image
                          src={`/api/clips/${clip.id}/thumbnail`}
                          alt=""
                          width={540}
                          height={960}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          Rendering preview
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{clip.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{clip.hook}</p>
                        </div>
                        <div className="rounded-md bg-primary/10 px-2 py-1 font-mono text-sm text-primary">
                          {clip.viralScore}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <StatusBadge status={clip.status} />
                        <span>{formatDuration(clip.durationMs)}</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/clips/${clip.id}`}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button asChild size="sm" disabled={!clip.outputUrl}>
                          <a href={`/api/clips/${clip.id}/download`}>
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-border text-center">
                <RefreshCw className="h-9 w-9 animate-spin text-primary" />
                <h2 className="mt-4 text-lg font-semibold">Clips are being prepared</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  The worker will create transcript segments, select strong moments, and render clips.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Processing status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm">
                <span>{latestJob?.type ?? "No jobs yet"}</span>
                {latestJob ? <StatusBadge status={latestJob.status} /> : null}
              </div>
              <Progress className="mt-4" value={latestJob?.progress ?? 0} />
              {latestJob?.error ? <p className="mt-3 text-sm text-destructive">{latestJob.error}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Job log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.processingJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-xs">{job.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell>{job.progress}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
