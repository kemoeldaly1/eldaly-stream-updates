# ==========================================================================
# ELDALY STREAM — Backend (Docker)
# البناء من جذر المستودع (build context = repo root):
#   docker build -t eldaly-backend .
#   docker run --rm -p 3000:3000 --env-file backend/.env eldaly-backend
#
# المرحلتين بنفس نسخة Node — ده شرط أساسي لـ bytecode بتاع V8
# (المصدر المجمّع لازم يتجمّع ويشتغل على نفس الإصدار الكبير).
# ==========================================================================

# ─── مرحلة البناء: تجميع الكود إلى bytecode (نفس ناتج npm run build) ───
FROM node:20-bookworm-slim AS build
WORKDIR /build
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/scripts ./scripts
COPY backend/src ./src
COPY backend/data ./data
RUN npm run build

# ─── مرحلة التشغيل: خفيفة وفيها ناتج deploy/ بس (بدون مصدر مقروء) ───
FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
# HOST=0.0.0.0 ضروري جوه الحاوية — الروتر بتاع الاستضافة بيوصل عبر الشبكة الداخلية
ENV HOST=0.0.0.0
COPY --from=build /build/deploy/package.json /build/deploy/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /build/deploy/boot.js ./
COPY --from=build /build/deploy/src ./src
# data/temp_tts كاش تشغيل مؤقت — الكلاود (Firestore) هو مصدر الحقيقة
RUN mkdir -p data temp_tts
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "boot.js"]
