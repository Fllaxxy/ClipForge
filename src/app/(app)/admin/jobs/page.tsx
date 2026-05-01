import { redirect } from "next/navigation";
import { RetryJobButton } from "@/components/retry-job-button";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export default async function AdminJobsPage() {
  const session = await getCurrentSession();
  if (session?.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const jobs = await getDb().processingJob.findMany({
    include: {
      project: {
        select: {
          id: true,
          title: true,
          user: {
            select: { email: true }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 80
  });

  return (
    <div className="space-y-8">
      <div>
        <Badge className="mb-3">Admin</Badge>
        <h1 className="text-3xl font-semibold">Debug jobs</h1>
        <p className="mt-2 text-muted-foreground">Inspect recent queue jobs, progress, logs, and failures.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Error</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="font-medium">{job.project.title}</div>
                    <div className="text-xs text-muted-foreground">{job.project.user.email}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{job.type}</TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell>{job.progress}%</TableCell>
                  <TableCell className="max-w-[320px] truncate text-xs text-muted-foreground">
                    {job.error ?? job.logs.at(-1) ?? ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <RetryJobButton jobId={job.id} disabled={job.status !== "FAILED"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
