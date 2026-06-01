#!/usr/bin/env bash
# Build script for Vercel.
# - Always regenerates Prisma Client.
# - Applies pending Prisma migrations to the database ONLY on production builds
#   (VERCEL_ENV=production). Preview deploys skip migrations so multiple open
#   PRs don't fight over the same Supabase DB.
# - Then runs the Next.js build.
#
# Locally `npm run build` sets VERCEL_ENV="" so migrations are skipped — use
# `npx prisma migrate dev` for local schema changes.

set -euo pipefail

npx prisma generate

if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "▲ Production build — applying Prisma migrations to the database"
  npx prisma migrate deploy
else
  echo "▲ Non-production build (VERCEL_ENV='${VERCEL_ENV:-unset}') — skipping prisma migrate deploy"
fi

npx next build
