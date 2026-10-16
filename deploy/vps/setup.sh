#!/usr/bin/env bash
# One-time bootstrap for a fresh Ubuntu 22.04/24.04 VPS (Namecheap Spark: 1 vCPU · 1 GB RAM · 20 GB SSD).
# Run as root:   curl -fsSL https://raw.githubusercontent.com/mirachtechnologiess/Bigbillionday/main/deploy/vps/setup.sh | bash
#   or:          scp deploy/vps/setup.sh root@SERVER:/root/ && ssh root@SERVER bash /root/setup.sh
#
# What it does (safe to re-run — every step checks before changing anything):
#   1. OS updates + automatic security updates
#   2. 2 GB swap file (the site slows down instead of crashing under memory pressure)
#   3. Docker Engine + Compose, with log rotation (10 MB × 3 per container)
#   4. journald capped at 200 MB
#   5. Firewall: only SSH, HTTP, HTTPS · fail2ban for SSH brute-force
#   6. "deploy" user for GitHub Actions (docker group, SSH key)
#   7. /opt/bigbillionday with a generated .env (random DB password, auth secret, admin password)
#   8. Weekly Docker cleanup + nightly database/uploads backups (kept 7 days)
set -euo pipefail

APP_DIR=/opt/bigbillionday
DEPLOY_USER=deploy
SWAP_SIZE_GB=2
export DEBIAN_FRONTEND=noninteractive

log() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
[ "$(id -u)" -eq 0 ] || { echo "Run as root"; exit 1; }

log "1/8 System updates"
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw fail2ban unattended-upgrades cron openssl
dpkg-reconfigure -f noninteractive unattended-upgrades || true

log "2/8 Swap (${SWAP_SIZE_GB} GB)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l "${SWAP_SIZE_GB}G" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE_GB * 1024))
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
cat > /etc/sysctl.d/99-bigbillionday.conf <<'EOF'
# Prefer RAM, use swap only under pressure; keep filesystem cache reasonable on a 1 GB box.
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
sysctl --system >/dev/null

log "3/8 Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "live-restore": true
}
EOF
systemctl enable docker
systemctl restart docker

log "4/8 journald size cap"
mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/size.conf <<'EOF'
[Journal]
SystemMaxUse=200M
EOF
systemctl restart systemd-journald

log "5/8 Firewall + fail2ban"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
systemctl enable --now fail2ban

log "6/8 Deploy user"
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
if [ ! -f "/home/$DEPLOY_USER/.ssh/id_ed25519" ]; then
  # Key pair used by GitHub Actions to log in as "deploy" (private key → repo secret VPS_SSH_KEY)
  sudo -u "$DEPLOY_USER" ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f "/home/$DEPLOY_USER/.ssh/id_ed25519" >/dev/null
  cat "/home/$DEPLOY_USER/.ssh/id_ed25519.pub" >> "/home/$DEPLOY_USER/.ssh/authorized_keys"
fi
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"

log "7/8 App directory + .env"
install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR" "$APP_DIR/backups"
if [ ! -f "$APP_DIR/.env" ]; then
  ADMIN_PW="$(openssl rand -base64 18 | tr -dc 'A-Za-z0-9' | head -c 16)"
  cat > "$APP_DIR/.env" <<EOF
# ── BigBillionDay production settings (keep this file private) ──
NEXT_PUBLIC_SITE_URL=https://bigbillionday.store
POSTGRES_PASSWORD=$(openssl rand -hex 24)
AUTH_SECRET=$(openssl rand -base64 48 | tr -d '\n')

# First admin account (created on first deploy; change the password after logging in)
ADMIN_EMAIL=admin@bigbillionday.store
ADMIN_PASSWORD=${ADMIN_PW}

# AI features — paste your NVIDIA key here
NVIDIA_API_KEY=
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_TEXT_MODEL=nvidia/nemotron-3-super-120b-a12b
NVIDIA_VISION_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b

# Online payments (leave empty until Razorpay is enabled in Admin > Settings)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
EOF
  chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "Generated $APP_DIR/.env  (admin password: ${ADMIN_PW})"
fi

log "8/8 Maintenance jobs"
# Weekly: remove images/build cache unused for 7+ days. NEVER prunes volumes (database, photos).
cat > /etc/cron.weekly/bigbillionday-docker-prune <<'EOF'
#!/bin/sh
docker image prune -af --filter "until=168h" >/dev/null 2>&1
docker builder prune -af --filter "until=168h" >/dev/null 2>&1
docker container prune -f >/dev/null 2>&1
EOF
chmod +x /etc/cron.weekly/bigbillionday-docker-prune

# Nightly 02:30 IST-ish backups: gzipped SQL dump + product photos, 7 days kept.
cat > /usr/local/bin/bigbillionday-backup <<EOF
#!/bin/sh
set -e
cd $APP_DIR
STAMP=\$(date +%Y%m%d-%H%M)
docker compose exec -T db pg_dump -U bbd -d bigbillionday --no-owner | gzip > backups/db-\$STAMP.sql.gz
docker run --rm -v bigbillionday_uploads:/u:ro -v $APP_DIR/backups:/b alpine tar czf /b/uploads-\$STAMP.tar.gz -C /u .
find backups -name '*.gz' -mtime +7 -delete
EOF
chmod +x /usr/local/bin/bigbillionday-backup
echo "30 21 * * * root /usr/local/bin/bigbillionday-backup >> /var/log/bigbillionday-backup.log 2>&1" > /etc/cron.d/bigbillionday-backup

log "Done"
cat <<EOF

Server is ready. Next steps:
 1. Paste your NVIDIA key:   nano $APP_DIR/.env
 2. Point DNS (Namecheap → Advanced DNS): A @ → $(curl -fsS4 https://ifconfig.me 2>/dev/null || echo SERVER_IP), A www → same IP
 3. In GitHub → repo → Settings → Secrets and variables → Actions, add:
      VPS_HOST     = $(curl -fsS4 https://ifconfig.me 2>/dev/null || echo SERVER_IP)
      VPS_USER     = $DEPLOY_USER
      VPS_SSH_KEY  = (the private key printed below, including the BEGIN/END lines)
 4. Push to main (or re-run the latest Actions workflow) → the site deploys automatically.

---------------- VPS_SSH_KEY (copy everything between the lines) ----------------
$(cat /home/$DEPLOY_USER/.ssh/id_ed25519)
-----------------------------------------------------------------------------------
EOF
