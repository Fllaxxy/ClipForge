#!/usr/bin/env sh
set -e

corepack enable

corepack pnpm prisma:deploy

exec corepack pnpm worker
