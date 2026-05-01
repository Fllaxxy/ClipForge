#!/usr/bin/env sh
set -e

corepack enable

corepack pnpm prisma:deploy

corepack pnpm worker
