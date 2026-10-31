# syntax=docker/dockerfile:1.7
# Multi-stage build → small standalone Next.js runtime image.
#   target "runner"   : the web app (default)
#   target "migrator" : runs `prisma migrate deploy` (+ optional seed) as a K8s Job / compose one-shot

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------- build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SITE_URL=https://premiumshopy.com
# Admin panel on its own subdomain; storefront links from admin become absolute. Leave empty for single-host.
ARG NEXT_PUBLIC_ADMIN_HOST=
ARG NEXT_PUBLIC_STORE_ORIGIN=
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ADMIN_HOST=${NEXT_PUBLIC_ADMIN_HOST}
ENV NEXT_PUBLIC_STORE_ORIGIN=${NEXT_PUBLIC_STORE_ORIGIN}
# Build-time DB access is not required: pages fall back gracefully and revalidate at runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate && npm run build

# ---------- migrator ----------
# Slim one-shot image: only what migrations, seeding and the catalog importer need (~1/5 the size
# of copying the full node_modules), so it pulls quickly on a small VPS.
FROM base AS migrator
RUN npm init -y >/dev/null  && npm install --omit=dev --no-audit --no-fund prisma@6.19.3 @prisma/client@6.19.3 bcryptjs@3.0.2 sharp@0.34.5  && npm cache clean --force
COPY prisma ./prisma
COPY scripts ./scripts
RUN npx prisma generate
ENV UPLOAD_DIR=/app/storage/uploads
CMD ["sh", "-c", "npx prisma migrate deploy && if [ \"$RUN_SEED\" = \"true\" ]; then node prisma/seed.mjs; fi"]

# ---------- runner ----------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/storage/uploads
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs \
 && mkdir -p /app/storage/uploads /app/.next/cache && chown -R nextjs:nodejs /app
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
