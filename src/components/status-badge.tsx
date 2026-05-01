import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  UPLOADED: "uploaded",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  RENDERING: "rendering"
};

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "FAILED" ? "destructive" : status === "READY" || status === "SUCCEEDED" ? "default" : "secondary";
  return <Badge variant={variant}>{statusLabels[status] ?? status.toLowerCase()}</Badge>;
}
