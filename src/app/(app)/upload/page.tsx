import { UploadPanel } from "@/components/upload-panel";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Upload video</h1>
        <p className="mt-2 text-muted-foreground">
          ClipForge will ingest, transcribe, score, caption, crop, and render clips in the background.
        </p>
      </div>
      <UploadPanel />
    </div>
  );
}
