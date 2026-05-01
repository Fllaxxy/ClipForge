#!/usr/bin/env sh
set -e

corepack enable

corepack pnpm prisma:deploy

if [ "$RUN_SEED_ON_START" = "true" ]; then
  corepack pnpm prisma:seed
fi

corepack pnpm start
