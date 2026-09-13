# 8) Infrastructure and deployment — Aria PetroOps

English technical manual. Persian original: [`../08-infrastructure-deployment.md`](../08-infrastructure-deployment.md).

## 8.1 Host

Dedicated VPS hostname `petro`. Public `petro.aria-ai.ir`. ~2 vCPU / 3.7 GiB. Do not compile the Nest app image on this box.

## 8.2 Topology

```
Internet → Nginx 80/443 (SPA + /api + /ws upgrade)
         → app (GHCR)
         → postgres, redis, mosquitto (internal)
         → edge (local image, MQTT publish)
```

## 8.3 Production

```bash
cd /opt/aria-petroops
docker compose -f docker-compose.yml pull --ignore-buildable
docker compose -f docker-compose.yml up -d --build --remove-orphans
docker compose -f docker-compose.yml restart nginx
```

## 8.4 Local Windows

Postgres/Redis/MQTT in Docker. Nest on 3002, Vite on 5173. Optional `docker compose up -d edge`.

## 8.5 Scripts

Entrypoints LF only. `.gitattributes` enforces this.
