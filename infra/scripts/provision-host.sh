#!/bin/sh
# Idempotent host bootstrap for 91.107.149.251 (Ubuntu 26.04)
# Run as root: bash /tmp/provision-host.sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl gnupg ufw git openssl

if [ ! -f /swapfile ]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon /swapfile || true
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  if ! apt-get update; then
    echo "Docker repo for ${CODENAME} unavailable; falling back to noble"
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
  fi
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

apt-get install -y certbot

if ! id deploy >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deploy
fi
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
if [ -f /tmp/petroops_ci.pub ]; then
  cat /tmp/petroops_ci.pub >> /home/deploy/.ssh/authorized_keys
fi
if [ -f /root/.ssh/authorized_keys ]; then
  cat /root/.ssh/authorized_keys >> /home/deploy/.ssh/authorized_keys
fi
if [ -f /home/deploy/.ssh/authorized_keys ]; then
  sort -u /home/deploy/.ssh/authorized_keys -o /home/deploy/.ssh/authorized_keys
fi
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

if [ -f /tmp/petroops_github ]; then
  install -m 600 -o deploy -g deploy /tmp/petroops_github /home/deploy/.ssh/id_ed25519_github
  if [ -f /tmp/petroops_github.pub ]; then
    install -m 644 -o deploy -g deploy /tmp/petroops_github.pub /home/deploy/.ssh/id_ed25519_github.pub
  fi
  ssh-keyscan -t ed25519,rsa github.com >> /home/deploy/.ssh/known_hosts 2>/dev/null || true
  chown deploy:deploy /home/deploy/.ssh/known_hosts
  chmod 644 /home/deploy/.ssh/known_hosts
  cat > /home/deploy/.ssh/config <<'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github
  IdentitiesOnly yes
  StrictHostKeyChecking accept-new
EOF
  chown deploy:deploy /home/deploy/.ssh/config
  chmod 600 /home/deploy/.ssh/config
fi

mkdir -p /opt/aria-petroops
chown deploy:deploy /opt/aria-petroops

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

docker --version
docker compose version
echo "provision complete"
