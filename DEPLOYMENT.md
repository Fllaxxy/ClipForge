# ClipForge Render Deployment

This path deploys ClipForge on Render with a Dockerized Next.js web service, a Dockerized BullMQ worker, Render Postgres, Render Key Value for Redis, and Cloudflare R2 for S3-compatible storage. The first deploy is intentionally cheap and low-friction: transcription and AI clip detection stay in mock mode, and Stripe stays disabled until its env vars are filled.

## 1. Push To GitHub

1. Create a new GitHub repo.
2. Commit this project, including `render.yaml`, `Dockerfile`, `Dockerfile.worker`, `prisma/`, and `src/`.
3. Push the default branch to GitHub.

Do not commit `.env`, local media, real R2 credentials, or Stripe/OpenAI keys.

## 2. Create Cloudflare R2 Storage

1. In Cloudflare, go to **Storage & databases > R2**.
2. Create a bucket, for example `clipforge`.
3. Create S3 API credentials with **Object Read & Write** access scoped to that bucket.
4. Copy the Access Key ID and Secret Access Key immediately.
5. Copy your S3 endpoint:

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

Recommended first-deploy values:

```text
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=clipforge
S3_FORCE_PATH_STYLE=true
```

After the app is working, you can switch `S3_PUBLIC_ENDPOINT` to a public R2 custom domain or Worker URL if that URL can serve generated asset links correctly.

## 3. Create The Render Blueprint

1. In Render, choose **New > Blueprint**.
2. Connect the GitHub repo.
3. Render will read `render.yaml`.
4. Confirm these resources:

| Resource | Render type | Purpose | Plan in `render.yaml` |
| --- | --- | --- | --- |
| `clipforge-web` | Web Service, Docker | Next.js 15 app | `free` |
| `clipforge-worker` | Background Worker, Docker | BullMQ + FFmpeg jobs | `starter` |
| `clipforge-postgres` | Postgres | Prisma database | `free` |
| `clipforge-redis` | Key Value | Redis-compatible BullMQ queue | `free` |

Render does not offer a free background worker plan, so the worker is the one paid component in this cheapest reliable setup.

## 4. Fill Render Environment Variables

The Blueprint wires these automatically:

```text
DATABASE_URL
REDIS_URL
NEXTAUTH_SECRET
TRANSCRIPTION_PROVIDER=mock
AI_PROVIDER=mock
S3_REGION=auto
S3_FORCE_PATH_STYLE=true
MAX_UPLOAD_BYTES=1073741824
CLIPFORGE_TMP_DIR=/tmp/clipforge
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
WORKER_CONCURRENCY=2
```

Render prompts for the `sync: false` values during Blueprint creation. Enter these for both the web and worker services:

```text
S3_BUCKET=clipforge
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_PUBLIC_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<your-r2-access-key-id>
S3_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
```

`NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` do not need to be hardcoded for the web service. `scripts/render-start.sh` derives them from Render's `RENDER_EXTERNAL_URL`. The worker receives the web URL through `WEB_EXTERNAL_URL`/`NEXT_PUBLIC_APP_URL` from the Blueprint.

Optional variables can stay empty for the first deploy:

```text
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CREATOR_PRICE_ID=
STRIPE_PRO_PRICE_ID=
OPENAI_API_KEY=
AI_API_KEY=
TRANSCRIPTION_API_KEY=
```

## 5. Migrate And Seed

The web service has this Blueprint predeploy command:

```bash
corepack pnpm prisma:deploy
```

Both Docker start scripts also run `corepack pnpm prisma:deploy` before starting, which makes redeploys resilient.

To seed demo/admin data once, temporarily set this on the web service and redeploy:

```text
RUN_SEED_ON_START=true
```

After the seed succeeds, set it back to `false` and redeploy. You can also run this from a Render shell if available:

```bash
corepack pnpm prisma:seed
```

## 6. Verify The Web App

1. Open the `clipforge-web` URL.
2. Check the health endpoint:

```text
https://<your-web-service>.onrender.com/api/health
```

3. Create an account from `/login`.
4. Open the dashboard and upload page.

## 7. Verify The Worker

In the `clipforge-worker` logs, look for:

```text
[worker] ClipForge worker listening on clipforge
```

If you do not see this, check `REDIS_URL`, `DATABASE_URL`, and whether the worker service is on a paid Render worker plan.

## 8. Upload A Test Video

1. Upload a short `.mp4`, `.mov`, `.mkv`, or `.webm`.
2. Watch the project status move from uploaded to processing to ready.
3. Check the admin jobs page for job progress.
4. Confirm objects are written to R2.
5. Preview and download a generated clip.

Mock transcription creates synthetic transcript segments, and mock AI uses the heuristic clip detector, so this first deploy can process without OpenAI or Whisper credentials.

## 9. Common Fixes

- **Blueprint cannot create Redis/Key Value:** create a Render **Key Value** instance manually, keep it in the same region as the app and worker, copy its internal connection string, and set `REDIS_URL` on both services. Use `maxmemoryPolicy=noeviction` for BullMQ.
- **Worker will not start:** Render background workers do not have a free plan. Move `clipforge-worker` to `starter` or higher.
- **Health check fails:** confirm the Docker command is `sh scripts/render-start.sh` and the app is binding to Render's `PORT`.
- **Login callback points at localhost:** make sure the web service is running the Render start script. It sets `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` from `RENDER_EXTERNAL_URL`.
- **R2 upload fails:** check `S3_ENDPOINT`, bucket name, key permissions, and that `S3_REGION=auto`.
- **Signed downloads fail:** set `S3_PUBLIC_ENDPOINT` to the same value as `S3_ENDPOINT` first. Switch to a custom public endpoint only after validating it can serve the generated URLs.
- **FFmpeg errors:** the Dockerfiles install `ffmpeg`, `ffprobe`, OpenSSL, and CA certificates. Confirm the worker is using `Dockerfile.worker`, not a native Node runtime.
- **Stripe buttons show an error:** this is expected when Stripe variables are empty. Add `STRIPE_SECRET_KEY`, price IDs, and webhook secret when you are ready to enable paid billing.
