"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryJobButton({ jobId, disabled }: { jobId: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const response = await fetch(`/api/admin/jobs/${jobId}/retry`, { method: "POST" });
          const json = (await response.json().catch(() => ({}))) as { error?: string };
          if (!response.ok) {
            toast.error(json.error ?? "Unable to retry job.");
            return;
          }
          toast.success("Job retry queued.");
        })
      }
    >
      <RotateCcw className="mr-2 h-4 w-4" />
      Retry
    </Button>
  );
}
