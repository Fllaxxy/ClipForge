import { describe, expect, it } from "vitest";
import { buildRetryJob } from "@/lib/jobs/retry";

describe("job retry logic", () => {
  it("maps failed processing jobs back to queue jobs", () => {
    const retry = buildRetryJob({
      userId: "user_1",
      job: {
        id: "job_1",
        projectId: "project_1",
        type: "RENDER_CLIPS",
        attempts: 1
      },
      priority: 1
    });

    expect(retry.name).toBe("renderClips");
    expect(retry.data.force).toBe(true);
    expect(retry.options.attempts).toBe(2);
  });
});
