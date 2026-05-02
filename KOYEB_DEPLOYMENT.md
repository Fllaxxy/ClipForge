# ClipForge Koyeb Deployment

This is the current cheapest deployment path for ClipForge:

- Koyeb free web service for the Next.js app.
- Supabase Postgres for Prisma.
- Upstash Redis for BullMQ queues.
- Cloudflare R2 for S3-compatible storage.
- No hosted FFmpeg worker yet.

The web app can accept uploads and enqueue jobs. Jobs only process while you run the worker locally with `corepack pnpm worker`.

## 1. Create External Services

### Supabase Postgres

1. Create a Supabase project.
2. Open **Project Settings > Database > Connection string**.
3. Use a Postgres URI that Prisma can use for migrations.
4. Save it as `DATABASE_URL`.

Prefer the direct connection string when your runtime supports it. If you use Supabase's pooler, choose a connection mode compatible with Prisma migrations.

### Upstash Redis

1. Create an Upstash Redis database.
2. Copy the Redis protocol URL, not the REST URL.
3. Save it as `REDIS_URL`.

The URL usually starts with `rediss://`. ClipForge uses `ioredis`, so the Redis protocol URL is required for BullMQ.

### Cloudflare R2

1. Create an R2 bucket, for example `clipforge`.
2. Create S3 API credentials with object read/write access.
3. Set:

```text
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=clipforge
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_FORCE_PATH_STYLE=true
```

For private signed downloads, start with:

```text
S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

You can later switch `S3_PUBLIC_ENDPOINT` to a public R2 custom domain or Worker URL if it supports your generated asset URLs.

## 2. Deploy The Web App On Koyeb

1. Push the repo to GitHub.
2. In Koyeb, create a new app/service from GitHub.
3. Select the `Fllaxxy/ClipForge` repo and `main` branch.
4. Choose Dockerfile deployment.
5. Use Dockerfile path:

```text
Dockerfile
```

6. Expose HTTP port `3000`. The app also respects Koyeb's `PORT` env var at runtime.
7. Use the free instance type/region available in your account.
8. Keep the run command empty unless Koyeb asks for one. The Dockerfile already runs:

```text
sh scripts/koyeb-start.sh
```

## 3. Koyeb Environment Variables

Set these on the Koyeb web service:

```text
DATABASE_URL=<supabase-postgres-uri>
REDIS_URL=<upstash-rediss-url>

NEXTAUTH_URL=https://your-koyeb-app.koyeb.app
NEXTAUTH_SECRET=<long-random-secret>
NEXT_PUBLIC_APP_URL=https://your-koyeb-app.koyeb.app

S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=clipforge
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_FORCE_PATH_STYLE=true

TRANSCRIPTION_PROVIDER=mock
AI_PROVIDER=mock
RUN_SEED_ON_START=false
```

Optional first-deploy values:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CREATOR_PRICE_ID=
STRIPE_PRO_PRICE_ID=
OPENAI_API_KEY=
AI_API_KEY=
TRANSCRIPTION_API_KEY=
```

`scripts/koyeb-start.sh` runs `corepack pnpm prisma:deploy` before starting the web server, so migrations run on every container start. To seed once, set `RUN_SEED_ON_START=true`, redeploy, then set it back to `false`.

## 4. Run The Worker Locally

The free Koyeb deployment does not host the FFmpeg worker. Keep a terminal open locally when you want jobs to process:

```bash
corepack pnpm install
corepack pnpm prisma:generate
corepack pnpm worker
```

Use the same production env vars locally:

```text
DATABASE_URL=<supabase-postgres-uri>
REDIS_URL=<upstash-rediss-url>
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=clipforge
S3_ACCESS_KEY_ID=<r2-access-key-id>
S3_SECRET_ACCESS_KEY=<r2-secret-access-key>
S3_FORCE_PATH_STYLE=true
TRANSCRIPTION_PROVIDER=mock
AI_PROVIDER=mock
```

FFmpeg and FFprobe must be installed on the machine running `corepack pnpm worker`. Upload/render jobs only process while this worker is running.

## 5. Verify

1. Open `https://your-koyeb-app.koyeb.app/api/health`.
2. Create an account.
3. Upload a short test video.
4. Confirm the project creates queued jobs.
5. Start `corepack pnpm worker` locally.
6. Watch job progress in the app or admin jobs page.
7. Confirm generated assets appear in Cloudflare R2.

## Troubleshooting

- **Koyeb health check fails:** confirm the service exposes port `3000` and the Dockerfile command is not overridden incorrectly.
- **Login redirects to the wrong domain:** set both `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the Koyeb app URL.
- **Prisma migration fails:** verify `DATABASE_URL` is a Supabase Postgres URI that supports migrations.
- **Jobs stay queued:** this is expected until you run `corepack pnpm worker` locally with production env vars.
- **Worker fails on FFmpeg:** install FFmpeg and FFprobe locally, then verify `ffmpeg -version` and `ffprobe -version`.
- **R2 upload fails:** verify bucket name, S3 credentials, endpoint, and `S3_REGION=auto`.
