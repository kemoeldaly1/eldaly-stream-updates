// ==========================================================================
// OverlayHttp — تقديم صفحات الأوفرلاي والويدجت من السحابة
// OBS بيحمّل الصفحة من الدومين مباشرة بتوكن خاص لكل حساب، والأحداث
// بتوصله عبر SSE من نفس السيرفر — من غير أي تمرير محلي.
// المسارات متطابقة مع مسارات السيرفر المحلي فنفس الصفحات بتشتغل:
//   /overlay/<token>/<screen>      صفحة الأوفرلاي
//   /events/<token>/<screen>       SSE أحداث الشاشة
//   /widget/<token>/<name>         صفحة ويدجت (كونفج محقون)
//   /widgets/stream                SSE الويدجت
//   /done/<token>/<screen>         إشارة انتهاء ميديا (no-op سحابيًا)
//
// متعدد الحسابات: التوكن هو اللي بيحدد الحساب — resolveToken بيرجّع سياق
// الحساب (store وغيره)، وكل عملاء SSE مفهرسين بالتوكن فأحداث كل بث
// بتوصل لصفحات OBS بتاعة صاحبها بس.
// ==========================================================================

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const OVERLAY_PAGE_VERSION = "9"; // رفع الإصدار يجبر صفحات OBS تعمل reload وتشغل الكود المصلح
const WIDGET_PAGE_VERSION = "2"; // نفس الفكرة لصفحات الويدجت (overlay-music) — SSE بيبعت reload لو الإصدار مختلف
const TOTAL_SCREENS = 10;

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  if (x.length === 0 || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

class OverlayHttpService {
  constructor(opts = {}) {
    // resolveToken(token) → سياق الحساب (فيه store و overlayToken) أو null
    this.resolveToken = opts.resolveToken || (() => null);
    this.widgetsDir = opts.widgetsDir || path.join(process.cwd(), "src", "widgets");
    this.screenClients = new Map(); // token -> { screenKey -> [res] }
    this.widgetClients = []; // [{ res, token }]
    this._rate = new Map(); // ip -> {start, count} — حماية تخمين التوكن
    setInterval(() => {
      const now = Date.now();
      for (const [ip, e] of this._rate) {
        if (now - e.start > 60000) this._rate.delete(ip);
      }
    }, 60000).unref();
    // نبضة كل 25 ثانية على اتصالات SSE — البروكسي بيقفل الاتصال الخامل
    // فالأحداث بتضيع في فجوة إعادة الاتصال (الأوفرلاي "مش بيسمع على طول").
    // الكومنت ": ka" مش حدث — الصفحات بتتجاهله والم proxies بتعده نشاط.
    const ka = ": ka\n\n";
    const alive = (res) => {
      try {
        res.write(ka);
        return true;
      } catch (e) {
        return false;
      }
    };
    setInterval(() => {
      for (const screens of this.screenClients.values()) {
        for (const k of Object.keys(screens)) {
          screens[k] = (screens[k] || []).filter(alive);
        }
      }
      this.widgetClients = this.widgetClients.filter((c) => alive(c.res));
    }, 25000).unref();
  }

  // ===== الأحداث الواردة من EventRunner/OverlayServer لحساب معين =====
  // ctx = سياق الحساب (بيتح реш من الـ registry) — لازم يكون معاه overlayToken
  handleEvent(ctx, type, payload) {
    if (!payload || typeof payload !== "object" || !ctx) return;
    const token = ctx.overlayToken;
    if (!token) return;
    const data = payload.data || payload;
    try {
      switch (type) {
        case "ov:media":
        case "ov:alert":
        case "ov:tts":
        case "ov:ttsq": {
          const screens = this.screenClients.get(token);
          if (!screens) break;
          const screen = String(payload.screen || "1");
          this.write(screens[screen] || [], data.item || data);
          break;
        }
        case "ov:stats":
          this.write(this.widgetClientsOf(token), { type: "stats", stats: payload.stats });
          break;
        case "ov:event":
          this.write(this.widgetClientsOf(token), { type: payload.event, data: payload.data });
          break;
        case "ov:ext":
          this.write(this.widgetClientsOf(token), { type: payload.event, data: payload.data });
          break;
        case "ov:wtest":
          this.write(this.widgetClientsOf(token), Object.assign({ type: "test" }, payload));
          break;
        case "ov:wcfg":
          this.write(this.widgetClientsOf(token), { type: "config", id: payload.id, config: payload.config });
          break;
      }
    } catch (e) {}
  }

  // مواضيع الأغاني (songqueue/sr-settings/sr-control) — بث لحظي لعملاء
  // الحساب بس. كل عميل هنا عدّى فحص توكن الأوفرلاي وقت فتح الاتصال في
  // /widgets/stream فبث إعدادات الحساب (الصوت/المقاس) ليه آمن.
  handleSongEvent(ctx, obj) {
    if (!ctx) return;
    try {
      this.write(this.widgetClientsOf(ctx.overlayToken), obj);
    } catch (e) {}
  }

  widgetClientsOf(token) {
    return this.widgetClients.filter((c) => c.token === token).map((c) => c.res);
  }

  // حد 90 طلب/دقيقة لكل IP على مسارات التوكن — يخلي تخمين التوكن مستحيل عمليًا
  _rateGate(req, res) {
    const ip = req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let e = this._rate.get(ip);
    if (!e || now - e.start > 60000) {
      e = { start: now, count: 0 };
      this._rate.set(ip, e);
    }
    e.count++;
    if (e.count > 90) {
      res.status(429).end("Too many requests");
      return false;
    }
    return true;
  }

  // إزالة كل عملاء SSE بتوع توكن معين (الحساب قفل)
  dropToken(token) {
    this.screenClients.delete(token);
    this.widgetClients = this.widgetClients.filter((c) => c.token !== token);
  }

  write(clients, payload) {
    const chunk = "data: " + JSON.stringify(payload) + "\n\n";
    return clients.filter((res) => {
      try {
        res.write(chunk);
        return true;
      } catch (e) {
        return false;
      }
    });
  }

  // ===== المسارات =====
  register(app) {
    const sseHeaders = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    };

    // صفحة الأوفرلاي
    app.get("/overlay/:token/:screen", (req, res) => {
      if (!this._rateGate(req, res)) return;
      const token = String(req.params.token || "");
      if (!this.resolveToken(token)) return res.status(404).end("Not found");
      const screen = parseInt(req.params.screen, 10);
      if (!screen || screen < 1 || screen > TOTAL_SCREENS) return res.status(404).end("Invalid screen");
      res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
      res.end(this._overlayHTML(token, String(screen)));
    });

    // SSE أحداث شاشة
    app.get("/events/:token/:screen", (req, res) => {
      if (!this._rateGate(req, res)) return;
      const token = String(req.params.token || "");
      if (!this.resolveToken(token)) return res.status(404).end("Not found");
      const screenNum = parseInt(req.params.screen, 10);
      if (screenNum < 1 || screenNum > TOTAL_SCREENS) {
        return res.status(404).end("Invalid screen");
      }
      const key = String(screenNum || "1");
      res.writeHead(200, sseHeaders);
      let screens = this.screenClients.get(token);
      if (!screens) {
        screens = {};
        this.screenClients.set(token, screens);
      }
      if (!screens[key]) screens[key] = [];
      screens[key].push(res);
      res.write(":ok\n\n");
      if (req.query.v !== OVERLAY_PAGE_VERSION) {
        res.write("data: " + JSON.stringify({ type: "reload" }) + "\n\n");
      }
      req.on("close", () => {
        const cur = this.screenClients.get(token);
        if (!cur) return;
        cur[key] = (cur[key] || []).filter((c) => c !== res);
        if (Object.keys(cur).length === 0) this.screenClients.delete(token);
      });
    });

    // SSE الويدجت — التوكن في query أو جاي من referer صفحة الويدجت (زي المحلي)
    app.get("/widgets/stream", (req, res) => {
      if (!this._rateGate(req, res)) return;
      const token =
        String(req.query.t || req.query.token || "") ||
        this._refererToken(req.headers.referer);
      if (!this.resolveToken(token)) return res.status(404).end("Not found");
      res.writeHead(200, sseHeaders);
      this.widgetClients.push({ res, token });
      res.write(":ok\n\n");
      // فحص واحد بس — صفحات الويدجت بتمرر نسخة الويدجت. الفحص التاني
      // (بتاع صفحة الأوفرلاي) كان بيضمن إن أي صفحة تدخل حلقة reload
      // لا نهائية لأنها مستحيل تطابق الثابتين مع بعض.
      if (req.query.v !== WIDGET_PAGE_VERSION) {
        res.write("data: " + JSON.stringify({ type: "reload" }) + "\n\n");
      }
      req.on("close", () => {
        this.widgetClients = this.widgetClients.filter((c) => c.res !== res);
      });
    });

    // إشارة انتهاء ميديا — سحابيًا الطابور محلي فبنرد ok بس
    app.post("/done/:token/:screen", (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
    });

    // الميديا المحلية مش متاحة سحابيًا — رد سريع عشان الصفحة تكمّل
    app.get("/media/*", (req, res) => res.status(404).end("Not found"));

    // صفحة ويدجت مع حقن الكونفج — الكونفج من بيانات صاحب التوكن
    const serveWidget = async (req, res, token, rel, urlObj) => {
      if (!this._rateGate(req, res)) return;
      const ctx = this.resolveToken(String(token || ""));
      if (!ctx) return res.status(404).end("Not found");
      const ext = path.extname(rel).toLowerCase();
      const root = path.resolve(this.widgetsDir);
      if (!ext || ext === ".html") {
        const name = (ext === ".html" ? rel.slice(0, -5) : rel);
        if (!/^[A-Za-z0-9_-]+$/.test(name)) return res.status(404).end("Not found");
        const filePath = path.join(root, name + ".html");
        if (!filePath.startsWith(root + path.sep)) return res.status(404).end("Not found");
        let html = null;
        try { html = fs.readFileSync(filePath, "utf-8"); } catch (e) {}
        if (html == null) return res.status(404).end("Widget not found");
        const widgetId = urlObj.searchParams.get("id") || name;
        let config = {};
        try { config = ctx.store.get("widget_" + widgetId) || {}; } catch (e) { config = {}; }
        const injected = JSON.stringify(config)
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'")
          .replace(/</g, "\\u003c")
          .replace(/>/g, "\\u003e");
        html = html.replace("__INITIAL_CONFIG__", () => injected);
        // صفحات الويدجت بتتصل بـ /widgets/stream من غير توكن ولا نسخة —
        // OBS مش بيبعت Referer فـ _authed كانت بترفض الاتصال (Not found)
        // والويدجت عمرها ما تستقبل حدث، وفحص النسخة كان يبعتهم في حلقة
        // reload لا نهائية. الحقن بيحل الاتنين: توكن + نسخة في الرابط.
        html = html
          .split("/widgets/stream")
          .join(
            "/widgets/stream?t=" +
              encodeURIComponent(String(token || "")) +
              "&v=" +
              WIDGET_PAGE_VERSION,
          );
        res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache, no-store, must-revalidate" });
        return res.end(html);
      }
      // أصول ثابتة جنب الويدجت (صور/أصوات محلية جوه فولدر الويدجت نفسه)
      const assetPath = path.join(root, rel);
      if (!assetPath.startsWith(root + path.sep)) return res.status(404).end("Not found");
      let asset = null;
      try { if (fs.existsSync(assetPath)) asset = fs.readFileSync(assetPath); } catch (e) {}
      if (!asset) return res.status(404).end("Not found");
      res.writeHead(200, { "Content-Type": mimeOf(ext), "Cache-Control": "public, max-age=86400" });
      res.end(asset);
    };

    app.get("/widget/:token/:name", (req, res) => {
      serveWidget(req, res, req.params.token, req.params.name, new URL(req.url, "http://x"));
    });
    app.get("/widgets/:token/:name", (req, res) => {
      if (req.params.token === "stream") return res.status(404).end();
      serveWidget(req, res, req.params.token, req.params.name, new URL(req.url, "http://x"));
    });

    // الجذر — مفيش توكن عام بعد تعدد الحسابات؛ الصفحة بتتفتح بتوكنها مباشرة
    app.get("/overlay", (req, res) => res.status(404).end());
  }

  _refererToken(referer) {
    const m = String(referer || "").match(/\/(overlay|widget|widgets)\/([0-9a-f]{8,64})\//);
    return m ? m[2] : "";
  }

  // ===== صفحة الأوفرلاي — نفس صفحة السيرفر المحلي حرفيًا (المسارات relative) =====
  _overlayHTML(token, screen) {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>ELDALY STREAM — Screen ${screen}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;800&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: transparent; }
  body { font-family: 'Inter', 'Segoe UI', sans-serif; }
  #stage { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .media { max-width: 100%; max-height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.4s ease; }
  .media.show { opacity: 1; }
  .media.fade-out { opacity: 0; transition: opacity 0.6s ease; }
  .alert-banner { position: fixed; top: 3vh; left: 0; right: 0; display: flex; justify-content: center; pointer-events: none; z-index: 10; }
  .alert-float { transform: translateY(-18px); opacity: 0; transition: transform 0.45s ease, opacity 0.45s ease; }
  .alert-float.show { transform: translateY(0); opacity: 1; }
  .alert-float.fade-out { transform: translateY(-14px); opacity: 0; transition: all 0.5s ease; }
  .alert-bob { display: flex; flex-direction: column; align-items: center; gap: 5px; animation: alertBob 2.4s ease-in-out infinite; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; }
  @keyframes alertBob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .alert-bob img.alert-photo { width: calc(var(--alert-photo-size, 64) * 1px); height: calc(var(--alert-photo-size, 64) * 1px); border-radius: 50%; object-fit: cover; border: 3px solid #d4af37; box-shadow: 0 3px 14px rgba(0, 0, 0, 0.5); }
  .alert-bob .alert-line { display: flex; align-items: center; gap: 7px; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9)); }
  .alert-bob .alert-name { font-size: calc(var(--alert-fs, 22) * 1px); font-weight: 800; white-space: nowrap; }
  .alert-bob .alert-sep { color: #d4af37; font-weight: 700; font-size: calc((var(--alert-fs, 22) - 6) * 1px); }
  .alert-bob .alert-msg { font-size: calc((var(--alert-fs, 22) - 3) * 1px); font-weight: 600; color: rgba(255, 255, 255, 0.95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 44vw; }
  .alert-user { font-size: 28px; font-weight: 800; color: #fff; text-shadow: 0 2px 12px rgba(168, 85, 247, 0.7), 0 0 40px rgba(168, 85, 247, 0.3); margin-bottom: 8px; animation: alertPulse 1.5s ease infinite; }
  .alert-text { font-size: 20px; font-weight: 600; color: rgba(255,255,255,0.9); text-shadow: 0 2px 8px rgba(0,0,0,0.5); text-align: center; max-width: 80%; }
  @keyframes alertPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
</style>
</head>
<body>
<div id="stage"></div>
<script>
const SCREEN_ID = '${screen}';
const PAGE_VERSION = '${OVERLAY_PAGE_VERSION}';
const TOKEN = '${token}';
const stage = document.getElementById('stage');
let currentTimeout = null;
let ttsQueue = [];
let ttsSpeaking = false;

function notifyDone() {
  fetch('/done/' + TOKEN + '/' + SCREEN_ID, { method: 'POST' }).catch(() => {});
}
function mediaUrl(p) {
  if (!p) return '';
  if (/^https?:\\/\\//i.test(p) || p.startsWith('data:')) return p;
  if (p.startsWith('/')) return p;
  return '/media/' + encodeURIComponent(p) + '?t=' + TOKEN;
}

const evtSource = new EventSource('/events/' + TOKEN + '/' + SCREEN_ID + '?v=' + PAGE_VERSION);
evtSource.onmessage = (e) => {
  const data = JSON.parse(e.data);
  if (data.type === 'reload') { location.reload(); return; }
  if (currentTimeout) { clearTimeout(currentTimeout); currentTimeout = null; }
  if (data.type === 'media') { handleMedia(data); }
  else if (data.type === 'alert') { handleAlert(data); }
  else if (data.type === 'tts') { handleTTS(data); }
};

function clearMediaNodes() {
  const nodes = stage.querySelectorAll('.media');
  nodes.forEach((node) => node.remove());
}

function buildAlertBanner(data) {
  const banner = document.createElement('div');
  banner.className = 'alert-banner';
  const floatEl = document.createElement('div');
  floatEl.className = 'alert-float';
  if (data.alertFontSize) floatEl.style.setProperty('--alert-fs', data.alertFontSize);
  if (data.alertPhotoSize) floatEl.style.setProperty('--alert-photo-size', data.alertPhotoSize);
  const bob = document.createElement('div');
  bob.className = 'alert-bob';
  let html = '';
  if (data.userPhoto) {
    html += '<img class="alert-photo" src="' + encodeURI(data.userPhoto).replace(/"/g, '%22').replace(/'/g, '%27') + '" onerror="this.remove()">';
  }
  let line = '';
  if (data.alertUser) {
    const uc = data.userColor || '#30D5C8';
    line += '<span class="alert-name" style="color:' + uc + '">' + escapeHtml(data.alertUser) + '</span>';
  }
  if (data.alertUser && data.alertText) line += '<span class="alert-sep">—</span>';
  if (data.alertText) {
    const tc = data.textColor || '#30D5C8';
    line += '<span class="alert-msg" style="color:' + tc + '">' + escapeHtml(data.alertText) + '</span>';
  }
  if (line) html += '<div class="alert-line">' + line + '</div>';
  bob.innerHTML = html;
  floatEl.appendChild(bob);
  banner.appendChild(floatEl);
  return banner;
}

function handleMedia(data) {
  const url = mediaUrl(data.path);
  const volume = (data.volume ?? 80) / 100;
  const duration = (data.duration || 5) * 1000;
  const shouldFade = data.fade !== false;
  clearMediaNodes();

  let mediaFinished = false;
  const finishMedia = (el) => {
    if (mediaFinished) return;
    mediaFinished = true;
    try { if (el && el.pause) el.pause(); } catch (e) {}
    const banner = stage.querySelector('.alert-float');
    if (shouldFade && el && el.classList && el.classList.contains('show')) {
      if (banner) { banner.classList.remove('show'); banner.classList.add('fade-out'); }
      el.classList.remove('show'); el.classList.add('fade-out');
      setTimeout(() => { stage.innerHTML = ''; notifyDone(); }, 700);
    } else {
      stage.innerHTML = ''; notifyDone();
    }
  };

  if (data.alertText || data.alertUser) {
    const existingBanner = stage.querySelector('.alert-banner');
    if (existingBanner) existingBanner.remove();
    const banner = buildAlertBanner(data);
    stage.appendChild(banner);
    requestAnimationFrame(() => {
      const floatEl = banner.querySelector('.alert-float');
      if (floatEl) floatEl.classList.add('show');
    });
  }

  if (data.kind === 'video') {
    if (!url) { currentTimeout = setTimeout(() => finishMedia(null), duration); return; }
    const el = document.createElement('video');
    el.src = url; el.autoplay = true; el.className = 'media'; el.volume = volume; el.playsInline = true;
    el.style.background = 'transparent';
    el.onloadeddata = () => { requestAnimationFrame(() => el.classList.add('show')); };
    el.onended = () => finishMedia(el);
    el.onerror = (e) => { console.error('Video error:', e); finishMedia(el); };
    stage.appendChild(el);
    currentTimeout = setTimeout(() => finishMedia(el), duration);
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('Video autoplay with sound blocked — retrying muted:', err);
        el.muted = true;
        el.play().then(() => {
          const hint = document.createElement('div');
          hint.style.cssText = 'position:absolute; top:10px; right:10px; background:rgba(255,165,0,0.9); color:#fff; padding:10px; border-radius:5px; font-family:sans-serif; font-size:14px; z-index:9999; cursor:pointer;';
          hint.textContent = '🔇 Click anywhere to enable sound';
          document.body.appendChild(hint);
          const unmute = () => { try { el.muted = false; el.volume = volume; } catch (e) {} hint.remove(); document.removeEventListener('click', unmute); };
          document.addEventListener('click', unmute);
        }).catch(err2 => { console.error('Video error:', err2); finishMedia(el); });
      });
    }
  } else if (data.kind === 'audio') {
    if (!url) { currentTimeout = setTimeout(() => finishMedia(null), duration); return; }
    const el = document.createElement('audio');
    el.src = url; el.autoplay = true; el.volume = volume;
    el.onended = () => finishMedia(el);
    el.onerror = (e) => { console.error('Audio error:', e); finishMedia(el); };
    stage.appendChild(el);
    currentTimeout = setTimeout(() => finishMedia(el), duration);
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        // بنفرّق بين حالتين: الملف نفسه فشل تحميله، وحظر التشغيل التلقائي —
        // الرسالة الغلط بتخلي المستخدم يضغط في المشكلة الغلط.
        if (el.error) {
          console.warn('Audio failed to load (media error code ' + el.error.code + ')');
          const warning = document.createElement('div');
          warning.style.cssText = 'position:absolute; top:10px; right:10px; background:rgba(217,122,116,0.95); color:#fff; padding:10px 14px; border-radius:5px; font-family:sans-serif; font-size:14px; z-index:9999; direction:rtl;';
          warning.textContent = '⚠ فشل تحميل الصوت — افتح الأكشن واختر الصوت تاني واعمل Save';
          document.body.appendChild(warning);
          setTimeout(() => warning.remove(), 6000);
          return;
        }
        console.warn('Audio autoplay blocked by policy — one click unlocks the page.');
        window.__pendingAudio = el;
        if (!document.getElementById('audio-unlock-hint')) {
          const hint = document.createElement('div');
          hint.id = 'audio-unlock-hint';
          hint.style.cssText = 'position:absolute; top:10px; right:10px; background:rgba(20,184,166,0.95); color:#fff; padding:10px 14px; border-radius:5px; font-family:sans-serif; font-size:14px; z-index:9999; direction:rtl;';
          hint.textContent = '🔊 اضغط في أي مكان على الصفحة مرة واحدة لتفعيل الصوت';
          document.body.appendChild(hint);
          setTimeout(() => { const h = document.getElementById('audio-unlock-hint'); if (h) h.remove(); }, 10000);
        }
        const unlock = () => {
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
          const h = document.getElementById('audio-unlock-hint');
          if (h) h.remove();
          const pending = window.__pendingAudio;
          window.__pendingAudio = null;
          if (pending && pending.isConnected) {
            pending.muted = false;
            pending.volume = volume;
            pending.play().catch(() => {});
          }
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
      });
    }
  } else if (data.kind === 'picture') {
    if (!url) { currentTimeout = setTimeout(() => finishMedia(null), duration); return; }
    const el = document.createElement('img');
    el.src = url; el.className = 'media'; el.style.background = 'transparent';
    el.onload = () => { requestAnimationFrame(() => el.classList.add('show')); };
    el.onerror = () => { stage.innerHTML = ''; notifyDone(); };
    stage.appendChild(el);
    currentTimeout = setTimeout(() => {
      if (shouldFade) {
        const picBanner = stage.querySelector('.alert-float');
        if (picBanner) { picBanner.classList.remove('show'); picBanner.classList.add('fade-out'); }
        el.classList.remove('show'); el.classList.add('fade-out');
        setTimeout(() => { stage.innerHTML = ''; notifyDone(); }, 700);
      } else { stage.innerHTML = ''; notifyDone(); }
    }, duration);
  }
}

function handleAlert(data) {
  stage.innerHTML = '';
  const duration = (data.duration || 5) * 1000;
  const shouldFade = data.fade !== false;
  const banner = document.createElement('div');
  banner.className = 'alert-banner';
  const floatEl = document.createElement('div');
  floatEl.className = 'alert-float';
  if (data.fontSize) floatEl.style.setProperty('--alert-fs', data.fontSize);
  if (data.alertPhotoSize) floatEl.style.setProperty('--alert-photo-size', data.alertPhotoSize);
  const bob = document.createElement('div');
  bob.className = 'alert-bob';
  let html = '';
  if (data.userPhoto) {
    html += '<img class="alert-photo" src="' + encodeURI(data.userPhoto).replace(/"/g, '%22').replace(/'/g, '%27') + '" onerror="this.remove()">';
  }
  let line = '';
  if (data.user) {
    const uc = data.userColor || '#30D5C8';
    line += '<span class="alert-name" style="color:' + uc + '">' + escapeHtml(data.user) + '</span>';
  }
  if (data.user && data.text) line += '<span class="alert-sep">—</span>';
  if (data.text) {
    const tc = data.textColor || '#30D5C8';
    line += '<span class="alert-msg" style="color:' + tc + '">' + escapeHtml(data.text) + '</span>';
  }
  if (line) html += '<div class="alert-line">' + line + '</div>';
  bob.innerHTML = html;
  floatEl.appendChild(bob);
  banner.appendChild(floatEl);
  stage.appendChild(banner);
  requestAnimationFrame(() => floatEl.classList.add('show'));
  currentTimeout = setTimeout(() => {
    if (shouldFade) {
      floatEl.classList.remove('show'); floatEl.classList.add('fade-out');
      setTimeout(() => { stage.innerHTML = ''; notifyDone(); }, 600);
    } else { stage.innerHTML = ''; notifyDone(); }
  }, duration);
}

function processTTSQueue() {
  if (ttsSpeaking || ttsQueue.length === 0) return;
  ttsSpeaking = true;
  const data = ttsQueue.shift();
  if (data.text) {
    let url = '';
    if (data.audioBase64) { url = 'data:audio/mp3;base64,' + data.audioBase64; }
    else if (data.audioUrl) { url = data.audioUrl; }
    else { url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(data.text.substring(0, 200)) + '&tl=' + (data.lang || 'ar') + '&client=tw-ob'; }
    const audio = new Audio(url);
    let vol = 1;
    if (data.config && data.config.volume !== undefined) vol = data.config.volume;
    else if (data.volume !== undefined) vol = data.volume;
    audio.volume = vol;
    audio.onended = () => { ttsSpeaking = false; setTimeout(processTTSQueue, 500); };
    audio.onerror = (e) => { console.error('TTS Error:', e); ttsSpeaking = false; setTimeout(processTTSQueue, 500); };
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => {
        console.warn('TTS playback prevented', err);
        ttsSpeaking = false;
        setTimeout(processTTSQueue, 500);
      });
    }
  } else { ttsSpeaking = false; processTTSQueue(); }
}

function handleTTS(data) {
  const maxQueue = data.maxQueue || 5;
  if (ttsQueue.length >= maxQueue) return;
  ttsQueue.push(data);
  processTTSQueue();
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
</script>
</body>
</html>`;
  }
}

module.exports = OverlayHttpService;
module.exports.safeEqual = safeEqual;

function mimeOf(ext) {
  const MIME = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif",
    ".webp": "image/webp", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".wav": "audio/wav",
    ".ogg": "audio/ogg", ".mp4": "video/mp4", ".webm": "video/webm", ".ttf": "font/ttf",
    ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2",
  };
  return MIME[ext] || "application/octet-stream";
}
