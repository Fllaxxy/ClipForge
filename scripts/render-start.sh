#!/usr/bin/env sh
set -e

if [ -n "${RENDER_EXTERNAL_URL:-}" ]; then
  export NEXTAUTH_URL="${NEXTAUTH_URL:-$RENDER_EXTERNAL_URL}"
  export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-$RENDER_EXTERNAL_URL}"
fi

export PORT="${PORT:-3000}"

corepack pnpm prisma:deploy

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  corepack pnpm prisma:seed
fi

exec corepack pnpm start
