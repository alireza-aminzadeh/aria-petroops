# syntax=docker/dockerfile:1
# =====================================================================
# Aria PetroOps — Dockerfile چندمرحله‌ای (Multi-stage) برای NestJS 11 / Node 22
# طبق قواعد امنیتی پروژه: ایمیج پایهٔ Alpine، کاربر non-root در مرحلهٔ نهایی،
# بدون secrets در لایه‌های نهایی.
# =====================================================================

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------
# Stage 1: نصب وابستگی‌ها (کش‌پذیر، جدا از کد اپلیکیشن)
# node-linker=hoisted: Nest باید reflect-metadata را از /app/node_modules پیدا کند
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN printf 'node-linker=hoisted\n' > .npmrc
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------
# Stage 2: توسعهٔ محلی (watch) — فقط از docker-compose.override استفاده می‌شود
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION} AS dev
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=development
EXPOSE 3000
CMD ["sh", "/app/infra/docker/api-dev.sh"]

# ---------------------------------------------------------------------
# Stage 3: Build (TypeScript -> JavaScript + SPA) سپس prune production
# ---------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN printf 'node-linker=hoisted\n' > .npmrc
RUN pnpm --filter @aria/contracts build
RUN pnpm --filter @aria/api exec prisma generate
RUN pnpm --filter @aria/api build
RUN pnpm --filter @aria/frontend build

# ---------------------------------------------------------------------
# Stage 4: ایمیج نهایی Runtime — کاربر non-root
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/fixtures ./fixtures
COPY --from=build /app/apps/frontend/dist ./public
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY infra/docker/api-prod.sh /api-prod.sh

# node:alpine already has uid 1000 (`node`); do not create a duplicate user.
RUN chmod +x /api-prod.sh && chown -R node:node /app /api-prod.sh

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=5 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["sh", "/api-prod.sh"]
