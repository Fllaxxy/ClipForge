#!/usr/bin/env sh
set -e

export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-${WEB_EXTERNAL_URL:-${RENDER_EXTERNAL_URL:-http://localhost:3000}}}"

corepack pnpm prisma:deploy

exec corepack pnpm worker
