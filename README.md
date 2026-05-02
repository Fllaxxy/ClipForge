# ClipForge

ClipForge is a full-stack SaaS app for turning long videos into vertical short-form clips with transcription, AI/heuristic highlight detection, ASS captions, FFmpeg rendering, S3-compatible storage, BullMQ workers, PostgreSQL, Auth.js/NextAuth, and Stripe billing.

## Quick Start

```bash
docker compose up --build
```

Open http://localhost:3000. Seeded users:

- `admin@clipforge.local` / `admin12345`
- `demo@clipforge.local` / `demo12345`

MinIO console runs at http://localhost:9001 with `minioadmin` / `minioadmin`.

## Local Development Without Docker

You need PostgreSQL, Redis, MinIO, FFmpeg, and FFprobe installed locally.

```bash
cp .env.example .env
corepack enable
corepack pnpm install
corepack pnpm prisma:migrate
corepack pnpm prisma:seed
corepack pnpm dev
corepack pnpm worker
```

## Pipeline

1. `ingestVideo`: stores or downloads the source, probes metadata with FFprobe, records usage.
2. `extractAudio`: extracts clean mono 16kHz WAV with FFmpeg.
3. `transcribeVideo`: uses mock, OpenAI-compatible, or local Whisper-style provider.
4. `detectClips`: validates AI JSON with Zod and falls back to heuristics if needed.
5. `renderClips`: cuts, crops to 1080x1920, burns ASS captions, watermarks free exports, generates thumbnails, uploads private assets.

## Stripe Setup

Create two recurring prices in Stripe and set:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CREATOR_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`

Webhook endpoint:

```text
http://localhost:3000/api/webhooks/stripe
```

Listen locally with:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Providers

Development defaults to mock transcription and mock/heuristic clip detection. To use hosted providers, set:

```env
TRANSCRIPTION_PROVIDER=openai-compatible
AI_PROVIDER=openai-compatible
OPENAI_API_KEY=...
```

For local Whisper, set `TRANSCRIPTION_PROVIDER=local-whisper` and configure `LOCAL_WHISPER_COMMAND` / `LOCAL_WHISPER_ARGS`.

## Production Notes

- Use real `NEXTAUTH_SECRET`, database credentials, Stripe keys, and S3 credentials.
- The free hosted deployment is Koyeb web only with Supabase Postgres, Upstash Redis, and Cloudflare R2.
- The FFmpeg worker is not hosted on the free Koyeb setup. Run it locally with `corepack pnpm worker` when you want queued upload/render jobs to process.
- Ensure FFmpeg is installed locally and compiled with libass for ASS subtitle rendering when running the worker.
- Keep assets private and serve them through signed URL routes.
- Configure object lifecycle rules for rendered clips and temp assets if desired.
- For the current free deployment path, follow `KOYEB_DEPLOYMENT.md`.

## Troubleshooting

- Worker not moving jobs: check Redis URL and worker logs.
- Clips fail rendering: verify FFmpeg/FFprobe are installed and `ffmpeg -filters` includes `subtitles`.
- Signed URLs fail in Docker: keep `S3_ENDPOINT=http://minio:9000` and `S3_PUBLIC_ENDPOINT=http://localhost:9000`.
- Stripe buttons return configuration errors until Stripe keys and price IDs are set.
