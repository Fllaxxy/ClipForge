"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDuration } from "@/lib/utils";

type Segment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

type ClipEditorProps = {
  clip: {
    id: string;
    title: string;
    hook: string;
    description: string | null;
    startMs: number;
    endMs: number;
    durationMs: number;
    viralScore: number;
    reason: string;
    status: string;
    outputUrl: string | null;
    captionStyleJson: Record<string, unknown> | null;
    cropJson: Record<string, unknown> | null;
  };
  sourceDurationMs: number;
  segments: Segment[];
};

export function ClipEditor({ clip, sourceDurationMs, segments }: ClipEditorProps) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(clip.title);
  const [hook, setHook] = useState(clip.hook);
  const [description, setDescription] = useState(clip.description ?? "");
  const [startMs, setStartMs] = useState(clip.startMs);
  const [endMs, setEndMs] = useState(clip.endMs);
  const [captionStyle, setCaptionStyle] = useState({
    fontSize: Number(clip.captionStyleJson?.fontSize ?? 72),
    textColor: String(clip.captionStyleJson?.textColor ?? "#ffffff"),
    highlightColor: String(clip.captionStyleJson?.highlightColor ?? "#facc15"),
    strokeColor: String(clip.captionStyleJson?.strokeColor ?? "#000000"),
    uppercase: Boolean(clip.captionStyleJson?.uppercase ?? true),
    wordsPerCaptionChunk: Number(clip.captionStyleJson?.wordsPerCaptionChunk ?? 4),
    position: String(clip.captionStyleJson?.position ?? "lower-third")
  });
  const [crop, setCrop] = useState({
    mode: String(clip.cropJson?.mode ?? "center"),
    x: Number(clip.cropJson?.x ?? 0.5),
    y: Number(clip.cropJson?.y ?? 0.5)
  });

  const activeTranscript = useMemo(
    () => segments.filter((segment) => segment.endMs > startMs && segment.startMs < endMs),
    [segments, startMs, endMs]
  );

  async function saveClip() {
    const response = await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        hook,
        description,
        startMs,
        endMs,
        captionStyle,
        crop
      })
    });
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(json.error ?? "Unable to save clip.");
    }
  }

  function onSave() {
    startTransition(async () => {
      try {
        await saveClip();
        toast.success("Clip saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save clip.");
      }
    });
  }

  function onRerender() {
    startTransition(async () => {
      try {
        await saveClip();
        const response = await fetch(`/api/clips/${clip.id}/rerender`, { method: "POST" });
        const json = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(json.error ?? "Unable to queue re-render.");
        toast.success("Re-render queued.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to queue re-render.");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-3">
            <div className="aspect-[9/16] overflow-hidden rounded-md bg-black">
              {clip.outputUrl ? (
                <video src={`/api/clips/${clip.id}/stream`} controls className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Render this clip to preview video
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Viral score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-semibold text-primary">{clip.viralScore}</div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{clip.reason}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl font-semibold">Clip editor</h1>
            <p className="mt-2 text-muted-foreground">
              {formatDuration(endMs - startMs)} selected from source timeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onSave} disabled={pending}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button onClick={onRerender} disabled={pending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-render
            </Button>
            <Button asChild variant="secondary">
              <a href={`/api/clips/${clip.id}/download`}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Title and hook</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hook</Label>
              <Textarea value={hook} onChange={(event) => setHook(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Start {formatDuration(startMs)}</span>
                <span>End {formatDuration(endMs)}</span>
              </div>
              <Slider
                min={0}
                max={Math.max(0, sourceDurationMs - 15_000)}
                step={500}
                value={[startMs]}
                onValueChange={([value]) => setStartMs(Math.min(value, endMs - 15_000))}
              />
              <Slider
                min={Math.min(sourceDurationMs, startMs + 15_000)}
                max={sourceDurationMs}
                step={500}
                value={[endMs]}
                onValueChange={([value]) => setEndMs(Math.max(value, startMs + 15_000))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Caption style</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-sm">
                  <span>Font size</span>
                  <Input
                    type="number"
                    min={36}
                    max={104}
                    value={captionStyle.fontSize}
                    onChange={(event) =>
                      setCaptionStyle({ ...captionStyle, fontSize: Number(event.target.value) })
                    }
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span>Words/chunk</span>
                  <Input
                    type="number"
                    min={1}
                    max={8}
                    value={captionStyle.wordsPerCaptionChunk}
                    onChange={(event) =>
                      setCaptionStyle({
                        ...captionStyle,
                        wordsPerCaptionChunk: Number(event.target.value)
                      })
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(["textColor", "highlightColor", "strokeColor"] as const).map((key) => (
                  <label key={key} className="space-y-2 text-sm">
                    <span>{key.replace("Color", "")}</span>
                    <Input
                      type="color"
                      value={captionStyle[key]}
                      onChange={(event) => setCaptionStyle({ ...captionStyle, [key]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label>Uppercase captions</Label>
                <Switch
                  checked={captionStyle.uppercase}
                  onCheckedChange={(checked) => setCaptionStyle({ ...captionStyle, uppercase: checked })}
                />
              </div>
              <label className="space-y-2 text-sm">
                <span>Caption position</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={captionStyle.position}
                  onChange={(event) => setCaptionStyle({ ...captionStyle, position: event.target.value })}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="lower-third">Lower third</option>
                </select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Crop controls</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="space-y-2 text-sm">
                <span>Crop mode</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={crop.mode}
                  onChange={(event) => setCrop({ ...crop, mode: event.target.value })}
                >
                  <option value="center">Center</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="custom">Custom x/y</option>
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span>Custom X</span>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[crop.x]}
                  onValueChange={([value]) => setCrop({ ...crop, x: value, mode: "custom" })}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Custom Y</span>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[crop.y]}
                  onValueChange={([value]) => setCrop({ ...crop, y: value, mode: "custom" })}
                />
              </label>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 space-y-3 overflow-auto">
            {activeTranscript.map((segment) => (
              <div key={segment.id} className="rounded-md border border-border p-3">
                <div className="font-mono text-xs text-muted-foreground">
                  {formatDuration(segment.startMs)} - {formatDuration(segment.endMs)}
                </div>
                <p className="mt-1 text-sm leading-6">{segment.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
