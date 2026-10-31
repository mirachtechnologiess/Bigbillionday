# Deploying PremiumShopy (premiumshopy.com)

Production runs on the shared AceCloud server **45.194.47.232** (Ubuntu 22.04, 2 vCPU, 8 GB, Noida),
next to other sites. The host's **nginx** terminates HTTPS and proxies to the app container on
`127.0.0.1:3600`; the app's own stack (`docker-compose.yml`: Next.js `web` + Postgres `db`) never
listens publicly.

| What | Where |
|---|---|
| App directory | `/opt/premiumshopy` (`.env`, `docker-compose.yml`, `deploy.log`, `backups/`) |
| Linux user | `premiumshopy` (member of `docker`; GitHub Actions logs in as this user) |
| nginx site | `/etc/nginx/sites-available/premiumshopy` (source: `nginx-premiumshopy.conf`) |
| HTTPS | Let's Encrypt via `certbot --nginx` (auto-renews) |
| Docker volumes | `premiumshopy_pgdata`, `premiumshopy_uploads` (product photos), `premiumshopy_nextcache` |

## DNS (Namecheap → premiumshopy.com → Advanced DNS)

A records `@`, `www`, `admin` → `45.194.47.232`.

## Deploys

Push to `main` → GitHub Actions lints/builds, pushes images to GHCR, then over SSH:
pull → migrate + seed → restart `web` → health check. Repo secrets:

| Secret | Value |
|---|---|
| `VPS_HOST` | `45.194.47.232` |
| `VPS_USER` | `premiumshopy` |
| `VPS_SSH_KEY` | private key whose public half is in `/home/premiumshopy/.ssh/authorized_keys` |

## First-time HTTPS (after DNS points here)

```bash
sudo certbot --nginx -d premiumshopy.com -d www.premiumshopy.com -d admin.premiumshopy.com --redirect
```

## Everyday commands (`sudo -iu premiumshopy`, then `cd /opt/premiumshopy`)

| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Logs | `docker compose logs -f --tail=100 web` |
| Restart | `docker compose restart web` |
| Last deploy output | `tail -100 deploy.log` |
| Backup DB | `docker compose exec -T db pg_dump -U premiumshopy -d premiumshopy --no-owner \| gzip > backups/db-$(date +%F).sql.gz` |
| Restore DB | `gunzip -c backups/db-XXXX.sql.gz \| docker compose exec -T db psql -U premiumshopy -d premiumshopy` |
