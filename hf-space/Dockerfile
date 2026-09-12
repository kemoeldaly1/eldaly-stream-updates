# ==========================================================================
# ELDALY STREAM — Hugging Face Space (Docker)
#
# السبيس العام بيبقى فيه الملف ده بس — الكود المصدر مبيتخزنش هنا خالص:
# بيتسحب وقت التشغيل من مستودع GitHub خاص بتوكن سري (Space secret اسمه
# GITHUB_PAT)، بيتجمّع bytecode، وبيشتغل — نفس حماية المصدر في كل مكان تاني.
#
# المطلوب في Settings → Variables and secrets (السبيس):
#   GITHUB_PAT   = توكن GitHub بصلاحية قراءة على الريبو الخاص
#   REPO_URL     = https://github.com/kemoeldaly1/eldaly-backend
#   FIREBASE_WEB_API_KEY / FIREBASE_PROJECT_ID = مزامنة بيانات العملاء
#   GITHUB_MEDIA_TOKEN (اختياري) = رفع فيديوهات/أصوات العملاء على CDN
#   PUBLIC_API_KEY / BACKUP_SECRET (اختياري) = مميزات إضافية مقفولة بدونهم
#
# ملاحظات HF:
#   * الحاوية بتشتغل بيوزر UID 1000 — لازم /app يكون ملكه.
#   * الأسرار بتوصل كمتغيرات بيئة وقت التشغيل بس (مش وقت البناء) — عشان
#     كده السحب والتجميع بيحصلوا في entrypoint مش في RUN.
# ==========================================================================

FROM node:20-bookworm-slim

# git لسحب الكود الخاص وقت التشغيل
RUN apt-get update -y && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*

# HF بيشغّل الحاوية بيوزر 1000 — جهّز المجلدات بملكيته
RUN useradd -m -u 1000 appuser \
    && mkdir -p /app \
    && chown -R appuser:appuser /app
USER appuser
ENV HOME=/home/appuser NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app

# سكريبت التشغيل: سحب → تثبيت → تجميع bytecode → إقلاع
# (المستودع معمول من جذر المشروع — الباك إند تحت backend/)
RUN cat > /entrypoint.sh <<'EOF'
#!/bin/bash
set -euo pipefail

: "${GITHUB_PAT:?GITHUB_PAT missing}"
: "${REPO_URL:?REPO_URL missing}"

echo "==> Fetching private source..."
rm -rf /app/repo
git clone --depth 1 "https://x-access-token:${GITHUB_PAT}@${REPO_URL#https://}" /app/repo

echo "==> Installing dependencies..."
cd /app/repo/backend
npm ci --omit=dev --no-audit --no-fund

echo "==> Compiling bytecode (source protection)..."
npm run build

echo "==> Installing runtime deps..."
cd /app/repo/backend/deploy
npm ci --omit=dev --no-audit --no-fund
mkdir -p data temp_tts

echo "==> Starting backend..."
exec node boot.js
EOF
RUN chmod +x /entrypoint.sh

# HF بيتوقع إن السبيس بيسمع على app_port من الـ README (3000)
EXPOSE 3000

CMD ["/entrypoint.sh"]
