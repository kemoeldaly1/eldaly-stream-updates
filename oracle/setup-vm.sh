#!/usr/bin/env bash
# ==========================================================================
# ELDALY STREAM — تسطيب مرة واحدة على سيرفر Oracle (Ubuntu ARM64)
# ينفذ بصلاحيات root:  sudo bash setup-vm.sh <DOMAIN>
# مثال:                 sudo bash setup-vm.sh app.1-2-3-4.sslip.io
#
# بيعمل: Docker + Caddy (HTTPS تلقائي) + فتح المنافذ + تشغيل الباك اند
# متطلبات قبله: فولدر /opt/eldaly فيه حزمة الرفع + ملف .env
# ==========================================================================
set -euo pipefail

DOMAIN="${1:?استخدام: sudo bash setup-vm.sh <DOMAIN>}"
APP_DIR="/opt/eldaly"

echo "==> [1/5] تثبيت Docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
  echo "    Docker موجود بالفعل"
fi
systemctl enable --now docker

echo "==> [2/5] فتح المنافذ 80/443 في جدار الحماية"
# صور أوراكل بتيجي بجدار حماية صارم من جوه — لازم فتح صريح للويب
apt-get install -y iptables-persistent || true
iptables -I INPUT -p tcp --dport 80 -j ACCEPT
iptables -I INPUT -p tcp --dport 443 -j ACCEPT
iptables -I INPUT -p tcp --dport 3000 -j ACCEPT || true
netfilter-persistent save || true

echo "==> [3/5] تثبيت Caddy (HTTPS تلقائي من Let's Encrypt)"
if ! command -v caddy >/dev/null 2>&1; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' -o /etc/apt/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
fi

echo "==> [4/5] إعداد Caddy على $DOMAIN"
cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN {
    reverse_proxy 127.0.0.1:3000
    # WebSocket بيوصل تلقائيًا عبر reverse_proxy — مدة أطول للبث الطويل
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options nosniff
    }
}
EOF
systemctl restart caddy
systemctl enable caddy

echo "==> [5/5] بناء وتشغيل الباك اند"
cd "$APP_DIR"
[ -f .env ] || { echo "!! ملف .env ناقص في $APP_DIR (شوف backend/.env.example)"; exit 1; }
docker compose up -d --build

echo ""
echo "=========================================="
echo "تمام ✅  الباك اند شغال على: https://$DOMAIN"
echo "فحص سريع:  curl https://$DOMAIN/api/health"
echo "=========================================="
