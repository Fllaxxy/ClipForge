#!/usr/bin/env sh
set -e

corepack enable

if [ -n "${KOYEB_PUBLIC_DOMAIN:-}" ]; then
  export NEXTAUTH_URL="${NEXTAUTH_URL:-https://$KOYEB_PUBLIC_DOMAIN}"
  export NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-https://$KOYEB_PUBLIC_DOMAIN}"
fi

export PORT="${PORT:-3000}"

corepack pnpm prisma:deploy

if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  corepack pnpm prisma:seed
fi

exec corepack pnpm start
