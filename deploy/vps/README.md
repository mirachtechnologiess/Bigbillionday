# Deploying BigBillionDay on a Namecheap "Spark" VPS

**Server:** 1 vCPU · 1 GB RAM · 20 GB SSD, Ubuntu 22.04 or 24.04.

**How it works:** GitHub Actions builds the Docker images. The VPS only downloads and runs them, because `next build` needs more than 1 GB of RAM. Docker Compose runs four pieces:

| Container | What it does | Memory limit |
|---|---|---|
| `caddy` | HTTPS (free Let's Encrypt certificate) and gzip, port 80/443 | 96 MB |
| `web` | the Next.js store and admin | 640 MB (≈115 MB at idle) |
| `db` | PostgreSQL 16, tuned for small RAM | 300 MB (≈45 MB at idle) |
| `migrate` | one-shot: database migrations, admin account, catalog import | runs, then exits |

A 2 GB swap file gives emergency memory, so the site slows down under pressure instead of crashing.

## 1. Buy the VPS and log in
Choose **Ubuntu 24.04**. Namecheap emails you the IP and root password.
```bash
ssh root@YOUR_SERVER_IP
```

## 2. Run the one-time setup (about 5 minutes)
```bash
curl -fsSL https://raw.githubusercontent.com/mirachtechnologiess/Bigbillionday/main/deploy/vps/setup.sh -o setup.sh
bash setup.sh
```
This sets up the server:
- updates the system and turns on automatic security updates
- adds 2 GB of swap
- installs Docker with log rotation (10 MB × 3 per container) and caps system logs at 200 MB
- turns on a firewall (SSH, 80 and 443 only) and fail2ban
- creates a `deploy` user for GitHub
- creates `/opt/bigbillionday/.env` with random passwords
- schedules a **weekly Docker cleanup** and **nightly backups** (database + photos, kept 7 days, in `/opt/bigbillionday/backups`)

At the end it prints your **admin password**, the **server IP** and a **private key**. Keep that output.

## 3. Add your NVIDIA key
```bash
nano /opt/bigbillionday/.env        # paste NVIDIA_API_KEY=nvapi-..., save with Ctrl+O, exit with Ctrl+X
```

## 4. Point the domain (Namecheap → Domain List → bigbillionday.store → Advanced DNS)
| Type | Host | Value |
|---|---|---|
| A Record | `@` | YOUR_SERVER_IP |
| A Record | `www` | YOUR_SERVER_IP |

Delete any old parking-page or URL-redirect records. DNS usually updates within 5–30 minutes.

## 5. Connect GitHub (one time)
GitHub → **mirachtechnologiess/Bigbillionday → Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `VPS_HOST` | server IP |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | the private key printed by setup.sh, from `-----BEGIN` through `END-----` |

Then go to **Actions → CI / CD → Run workflow** (or just push to `main`). It runs four steps: lint and build, push the images to GitHub Container Registry, SSH to the server, then pull, migrate, restart and check health.

## 6. Import your products (first time only)
```bash
ssh deploy@YOUR_SERVER_IP
cd /opt/bigbillionday
docker compose run --rm migrate node scripts/import-legacy.mjs
```
This imports all products and photos from the old premiumshopy.com in about 1–2 minutes. Then open **https://bigbillionday.store** and log in at **/admin** with the admin password from step 2.

## Everyday commands (as `deploy`, in `/opt/bigbillionday`)
| Task | Command |
|---|---|
| Status | `docker compose ps` |
| Live logs | `docker compose logs -f web` |
| Memory / CPU | `docker stats --no-stream` · `free -h` |
| Disk space | `df -h /` · `docker system df` |
| Restart site | `docker compose restart web` |
| Backup now | `sudo /usr/local/bin/bigbillionday-backup` |
| Restore DB | `gunzip -c backups/db-XXXX.sql.gz \| docker compose exec -T db psql -U bbd -d bigbillionday` |
| Roll back | edit `TAG=` in `.env` to an older commit SHA, then `docker compose up -d web` |

## Will it run out of space?
No, not for a long time. Product photos are converted to WebP (≈45 KB each), so your current 412 photos take 19 MB. The database is a few MB. Most of the 20 GB goes to Ubuntu and Docker images, and the weekly cleanup removes old images. Check with `df -h /` once a month. If disk use goes above 80%, move photos to Cloudflare R2 or Cloudinary, or upgrade the plan.

## When to upgrade
Upgrade to 2 vCPU / 2–4 GB RAM if `free -h` shows swap used above 500 MB most of the time, if pages feel slow during sales, or if `docker compose logs web` shows restarts. Moving is easy: run setup.sh on the new server, restore the latest backup, and change `VPS_HOST`.
