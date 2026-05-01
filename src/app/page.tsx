import Link from "next/link";
import { ArrowRight, Captions, Clapperboard, Crop, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const features = [
  ["AI highlight detection", "Finds emotional spikes, story turns, useful advice, and curiosity gaps."],
  ["Auto captions", "Burns crisp ASS subtitles with safe margins for every short-form platform."],
  ["Vertical crop", "Creates 1080x1920 9:16 clips with a modular smart-crop pipeline."],
  ["Viral hook generator", "Titles, hooks, and reasons explain why each moment can perform."],
  ["Batch exports", "Render 5 to 20 clips from one long video and download each asset."],
  ["Creator workflow", "Preview, trim, rename, restyle captions, re-render, and ship."]
];

const faqs = [
  ["Can I use local tools?", "Yes. Local MinIO, Redis, PostgreSQL, FFmpeg, and a mock Whisper provider are wired for development."],
  ["Can I swap transcription providers?", "Yes. The provider interface supports mock, OpenAI-compatible, and local Whisper-style runners."],
  ["Are videos private?", "Assets are stored privately and served through signed URLs after ownership checks."],
  ["Do free exports include a watermark?", "Yes. Free users get a small ClipForge watermark; paid plans remove it."]
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <section className="clipforge-grid relative border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.24),transparent_42%),radial-gradient(circle_at_80%_30%,rgba(250,204,21,0.14),transparent_28%)]" />
        <div className="relative mx-auto grid min-h-[92vh] max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_520px] lg:items-center">
          <div className="flex flex-col justify-center">
            <Badge className="mb-5 w-fit border-primary/30 bg-primary/10 text-primary">
              Production video pipeline for creators
            </Badge>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] md:text-7xl">
              Turn long videos into viral shorts automatically
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Upload a podcast, webinar, stream, or interview. ClipForge transcribes it,
              scores high-retention moments, renders vertical captioned clips, and gives your
              team a launch-ready editing workflow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6">
                <Link href="/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload video
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 px-6">
                <Link href="/pricing">
                  View pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="grid grid-cols-[0.72fr_1fr] items-center gap-4">
              <div className="rounded-lg border border-border bg-card/90 p-3 shadow-glow">
                <div className="aspect-[9/16] rounded-md bg-[linear-gradient(160deg,#20242a,#0b0f12_58%,#172b2a)] p-3">
                  <div className="h-full rounded border border-white/10 bg-black/30 p-2">
                    <div className="h-20 rounded bg-white/10" />
                    <div className="mt-3 h-3 w-2/3 rounded bg-white/15" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Before: long horizontal source</p>
              </div>
              <div className="rounded-lg border border-primary/40 bg-card p-4 shadow-glow">
                <div className="aspect-[9/16] overflow-hidden rounded-md bg-[linear-gradient(180deg,#111827,#0f1918)]">
                  <div className="flex h-full flex-col justify-end p-5">
                    <div className="mb-28 rounded bg-black/70 px-3 py-2 text-center text-xl font-black uppercase leading-tight text-white [text-shadow:_0_2px_0_rgb(0_0_0)]">
                      The moment everything changed
                    </div>
                    <div className="rounded-md border border-primary/30 bg-primary/15 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span>Viral score</span>
                        <span className="font-mono text-primary">92</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10">
                        <div className="h-full w-[92%] rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">After: captioned vertical export</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            <p className="text-sm uppercase text-primary">Before and after</p>
            <h2 className="mt-2 text-3xl font-semibold">A pipeline that edits while you work</h2>
          </div>
          <Clapperboard className="hidden h-10 w-10 text-primary sm:block" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Transcript intelligence</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              Timestamped segments become clip candidates, subtitles, timeline handles, and
              searchable context for every project.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Caption engine</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              ASS rendering gives styled strokes, bold text, keyword highlights, and safe lower
              third positioning that drawtext cannot match cleanly.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Queue-first rendering</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-muted-foreground">
              BullMQ jobs keep long FFmpeg and transcription tasks outside request lifecycles
              with retries, logs, and admin visibility.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-10">
            <p className="text-sm uppercase text-primary">Features</p>
            <h2 className="mt-2 text-3xl font-semibold">Everything needed to ship clips</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, description], index) => {
              const Icon = [Sparkles, Captions, Crop, Sparkles, Clapperboard, Upload][index];
              return (
                <Card key={title}>
                  <CardHeader>
                    <Icon className="mb-2 h-5 w-5 text-primary" />
                    <CardTitle>{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm leading-6 text-muted-foreground">
                    {description}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            ["Free", "$0", "30 minutes/month", "3 clips/project", "Watermark"],
            ["Creator", "$29", "300 minutes/month", "20 clips/project", "No watermark"],
            ["Pro", "$99", "1500 minutes/month", "Priority batch processing", "No watermark"]
          ].map(([plan, price, line1, line2, line3]) => (
            <Card key={plan} className={plan === "Creator" ? "border-primary shadow-glow" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan}
                  {plan === "Creator" ? <Badge>Popular</Badge> : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-semibold">{price}</div>
                <p className="mt-2 text-sm text-muted-foreground">per month</p>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <li>{line1}</li>
                  <li>{line2}</li>
                  <li>{line3}</li>
                </ul>
                <Button asChild className="mt-6 w-full" variant={plan === "Free" ? "secondary" : "default"}>
                  <Link href={plan === "Free" ? "/login" : "/pricing"}>Start with {plan}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[340px_1fr]">
          <div>
            <p className="text-sm uppercase text-primary">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold">Built for real processing</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map(([question, answer]) => (
              <Card key={question}>
                <CardHeader>
                  <CardTitle>{question}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm leading-6 text-muted-foreground">
                  {answer}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>ClipForge</p>
          <div className="flex gap-4">
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Login</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
