# ClipForge Deployment

ClipForge now uses Koyeb as the primary free hosted deployment target. The hosted service is web-only:

- Koyeb runs the Next.js web app from `Dockerfile`.
- Supabase provides Postgres through `DATABASE_URL`.
- Upstash provides Redis through `REDIS_URL`.
- Cloudflare R2 provides S3-compatible object storage.
- The FFmpeg/BullMQ worker is not hosted in the free Koyeb setup.

Follow `KOYEB_DEPLOYMENT.md` for exact setup steps.

## Worker Status

Upload and render jobs are still queued by the web app, but they only process while a worker is running. For now, run the worker locally:

```bash
corepack pnpm worker
```

The local worker needs the same production `DATABASE_URL`, `REDIS_URL`, and R2 env vars as the Koyeb web service, plus local FFmpeg/FFprobe installed.
