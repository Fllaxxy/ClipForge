"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

type UploadResponse = {
  projectId?: string;
  error?: string;
};

export function UploadPanel() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [isDragging, setDragging] = useState(false);

  function chooseFile(nextFile?: File) {
    if (!nextFile) return;
    setFile(nextFile);
  }

  function submit(formData: FormData) {
    if (file) {
      formData.set("file", file);
    }

    setBusy(true);
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/projects/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      setBusy(false);
      const json = JSON.parse(xhr.responseText || "{}") as UploadResponse;
      if (xhr.status >= 400 || !json.projectId) {
        toast.error(json.error ?? "Upload failed.");
        return;
      }
      toast.success("Project queued for processing.");
      router.push(`/projects/${json.projectId}`);
    };
    xhr.onerror = () => {
      setBusy(false);
      toast.error("Upload failed.");
    };
    xhr.send(formData);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a clip project</CardTitle>
        <CardDescription>Upload mp4, mov, mkv, or webm. You can also paste a direct video URL.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Project title</Label>
            <Input id="title" name="title" placeholder="Podcast episode, webinar, interview..." required />
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseFile(event.dataTransfer.files[0]);
            }}
            className={`flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/10" : "border-border bg-secondary/20"
            }`}
          >
            <UploadCloud className="h-12 w-12 text-primary" />
            <h2 className="mt-4 text-lg font-semibold">Drag and drop your video</h2>
            <p className="mt-2 text-sm text-muted-foreground">Maximum size is configured by MAX_UPLOAD_BYTES.</p>
            {file ? (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-background px-3 py-2 text-sm">
                <span>{file.name}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".mp4,.mov,.mkv,.webm,video/mp4,video/quicktime,video/webm"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Or paste video URL
            </Label>
            <Input id="url" name="url" type="url" placeholder="https://example.com/video.mp4" />
          </div>

          {busy ? (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground">{progress}% uploaded</p>
            </div>
          ) : null}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Creating project..." : "Create project and job"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
