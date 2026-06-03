#!/usr/bin/env bash
# Build script for Vercel.
# - Always regenerates Prisma Client.
# - Applies pending Prisma migrations to the database on production AND preview
#   builds (VERCEL_ENV=production|preview). Production migrates the prod DB;
#   preview migrates the dedicated preview DB (a separate Supabase project whose
#   DATABASE_URL is scoped to the Preview environment). Because the two DBs are
#   isolated, open PRs don't touch prod data.
# - Then runs the Next.js build.
#
# Locally `npm run build` sets VERCEL_ENV="" so migrations are skipped — use
# `npx prisma migrate dev` for local schema changes.

set -euo pipefail

npx prisma generate

if [ "${VERCEL_ENV:-}" = "production" ] || [ "${VERCEL_ENV:-}" = "preview" ]; then
  echo "▲ ${VERCEL_ENV} build — applying Prisma migrations to the ${VERCEL_ENV} database"
  npx prisma migrate deploy
else
  echo "▲ Non-deployed build (VERCEL_ENV='${VERCEL_ENV:-unset}') — skipping prisma migrate deploy"
fi

npx next build
