# syntax=docker/dockerfile:1
# =====================================================================
# Aria PetroOps — Dockerfile چندمرحله‌ای (Multi-stage) برای NestJS 11 / Node 22
# طبق قواعد امنیتی پروژه: ایمیج پایهٔ Alpine، کاربر non-root در مرحلهٔ نهایی،
# بدون secrets/devDependencies در لایه‌های نهایی.
# =====================================================================

ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------
# Stage 1: نصب وابستگی‌ها (کش‌پذیر، جدا از کد اپلیکیشن)
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
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
# Stage 3: Build (TypeScript -> JavaScript + SPA)
# ---------------------------------------------------------------------
FROM deps AS build
COPY . .
RUN pnpm --filter @aria/contracts build
RUN pnpm --filter @aria/api exec prisma generate
RUN pnpm --filter @aria/api build
RUN pnpm --filter @aria/frontend build

# ---------------------------------------------------------------------
# Stage 4: نصب فقط وابستگی‌های Production
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --prod --frozen-lockfile
RUN pnpm --filter @aria/api exec prisma generate

# ---------------------------------------------------------------------
# Stage 5: ایمیج نهایی Runtime — کاربر non-root، بدون build tools
# ---------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/packages/contracts ./packages/contracts
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY --from=build /app/apps/api/fixtures ./fixtures
COPY --from=build /app/apps/frontend/dist ./public
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/package.json ./package.json
COPY infra/docker/api-prod.sh /api-prod.sh

RUN addgroup -g 1000 appgroup \
    && adduser -D -u 1000 -G appgroup appuser \
    && chmod +x /api-prod.sh \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["sh", "/api-prod.sh"]
