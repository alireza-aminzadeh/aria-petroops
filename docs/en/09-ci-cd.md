# 9) CI/CD — Aria PetroOps

English technical manual. Persian original: [`../09-ci-cd.md`](../09-ci-cd.md).  
Workflow: `.github/workflows/ci-cd.yml`.

## 9.1 Jobs

| Job | What |
|---|---|
| test | pnpm, Prisma generate, contracts build, lint, migrate, provision app role, Jest |
| build-and-push | `ghcr.io/alireza-aminzadeh/aria-petroops-app:<sha>` |
| deploy | SSH, `IMAGE_TAG`, compose pull/up |

Triggers: `push` / `pull_request` to `main`, plus `workflow_dispatch`. Markdown-only changes (`**/*.md`, `docs/**`) are ignored so a documentation edit does not rebuild images or cancel a live deploy.

## 9.2 Secrets

`PETROOPS_SSH_HOST`, `PETROOPS_SSH_USER`, `PETROOPS_SSH_KEY`. Environment `production`.

## 9.3 RLS regression

CI runs `provision-app-role.js` with a throwaway role so a broken RLS script fails before production `api-prod.sh`.

## 9.4 Edge

Built on the VPS as `aria-petroops-edge:local` so GHCR app pull stays small and the host does not OOM on `nest build`.
