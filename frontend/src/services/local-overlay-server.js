// ==========================================================================
// LocalOverlayServer — سيرفر الأوفرلاي المحلي داخل تطبيق الديسكتوب.
//
// كل صفحات الأوفرلاي والويدجت بتتقدم من جهاز المستخدم نفسه على 127.0.0.1،
// وكل الروابط محمية بتوكن سداسي (32 hex) فريد لكل حساب — محدش يقدر يخمّن
// روابط OBS بتاعة غيره. الأحداث نفسها بتيجي من الباك إند عبر WebSocket
// وبتمرّر لصفحات OBS عن طريق SSE.
// ==========================================================================

const http = require("http");
const path = require("path");
const fs = require("fs");

const TOTAL_SCREENS = 10;
const OVERLAY_PAGE_VERSION = "9";
const DEFAULT_PORT = parseInt(process.env.LOCAL_OVERLAY_PORT || "7330", 10);

const MIME_TYPES = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

class LocalOverlayServer {
  constructor(opts = {}) {
    this.widgetsDir =
      opts.widgetsDir || path.join(__dirname, "..", "..", "src", "widgets");
    this.getConfig = opts.getConfig || (async () => ({}));
    // قراءة مشفرة للويدجت (HTML/CSS) — بتيجي من secure-assets في main
    this.readAsset = opts.readAsset || null;
    this.onQueueUpdate = opts.onQueueUpdate || (() => {});

    this.port = null;
    this.token = null;
    this.server = null;

    this.clients = {};
    this.queues = {};
    this.playing = {};
    this.doneTimers = {};
    this.widgetClients = [];
    this.currentStats = null;

    for (let i = 1; i <= TOTAL_SCREENS; i++) {
      this.clients[String(i)] = [];
      this.queues[String(i)] = [];
      this.playing[String(i)] = false;
    }
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================
  start() {
    return new Promise((resolve) => {
      if (this.server) return resolve(this.port);
      const create = (port, remaining) => {
        this.server = http.createServer((req, res) => {
          this._handleRequest(req, res).catch(() => {
            try {
              res.writeHead(500);
              res.end("Internal error");
            } catch (e) {}
          });
        });
        this.server.on("error", (err) => {
          if (err.code === "EADDRINUSE" && remaining > 0) {
            try {
              this.server.close();
            } catch (e) {}
            this.server = null;
            create(port + 1, remaining - 1);
          } else {
            // آخر محاولة: خلي نظام التشغيل يختار بورت فاضي
            try {
              this.server.close();
            } catch (e) {}
            this.server = null;
            this.server = http.createServer((req, res) => {
              this._handleRequest(req, res).catch(() => {
                try {
                  res.writeHead(500);
                  res.end("Internal error");
                } catch (e) {}
              });
            });
            this.server.listen(0, "127.0.0.1", () => {
              this.port = this.server.address().port;
              resolve(this.port);
            });
          }
        });
        this.server.listen(port, "127.0.0.1", () => {
          this.port = port;
          resolve(this.port);
        });
      };
      create(DEFAULT_PORT, 20);
    });
  }

  stop() {
    if (this.server) {
      try {
        this.server.close();
      } catch (e) {}
      this.server = null;
    }
  }

  setToken(token) {
    this.token = token || null;
  }

  getBase() {
    return "http://127.0.0.1:" + (this.port || DEFAULT_PORT);
  }

  getOverlayUrls() {
    if (!this.token) return [];
    const urls = [];
    for (let i = 1; i <= TOTAL_SCREENS; i++) {
      urls.push({
        screen: i,
        url: this.getBase() + "/overlay/" + this.token + "/" + i,
      });
    }
    return urls;
  }

  getWidgetUrl(name, qs) {
    if (!this.token) return "";
    return (
      this.getBase() +
      "/widget/" +
      this.token +
      "/" +
      name +
      (qs ? "?" + qs : "")
    );
  }

  getQueueStatus() {
    const out = {};
    for (let i = 1; i <= TOTAL_SCREENS; i++) {
      const s = String(i);
      out[s] = {
        length: (this.queues[s] || []).length,
        playing: !!this.playing[s],
      };
    }
    return out;
  }

  // =========================================================================
  // Push APIs — بينادي عليها main.js لما توصل أحداث ov:* من الباك إند
  // =========================================================================
  pushMedia(screen, item) {
    this._enqueueOrPlay(String(screen || "1"), item);
  }

  pushAlert(screen, item) {
    this._enqueueOrPlay(String(screen || "1"), item);
  }

  pushTTS(screen, item) {
    this._broadcast(String(screen || "1"), item);
  }

  pushTTSQueue(screen, item) {
    this._broadcast(String(screen || "1"), item);
  }

  pushStats(stats) {
    this.currentStats = stats;
    this._writeToClients(this.widgetClients, { type: "stats", stats });
  }

  pushEvent(event, data) {
    this._writeToClients(this.widgetClients, { type: event, data });
  }

  pushExt(event, data) {
    this._writeToClients(this.widgetClients, { type: event, data });
  }

  pushWidgetTest(id, payload) {
    this._writeToClients(this.widgetClients, { type: "test", id, ...payload });
  }

  pushWidgetConfig(id, config) {
    this._writeToClients(this.widgetClients, { type: "config", id, config });
  }

  // =========================================================================
  // Queue logic (مبنية على نفس سلوك النسخة القديمة في الباك إند)
  // =========================================================================
  _enqueueOrPlay(screen, item) {
    if (!this.queues[screen]) this.queues[screen] = [];
    const MAX_QUEUE = 50;
    // الأصوات بتتشغل فورًا — مش بتستنى ورا فيديو شغال ولا تشغيل عالق.
    // الفيديو بس اللي بيتطابور عشان فيديو ميقطعش على فيديو تاني.
    if (item && item.type === "audio") {
      this._broadcast(screen, item);
      this.onQueueUpdate(this.getQueueStatus());
      return;
    }
    // سقف للطابور — لو OBS مش متوصل طويلًا الطابور مش هينمو بلا حدود (تسريب ذاكرة)
    if (this.queues[screen].length >= MAX_QUEUE) this.queues[screen].shift();
    this.queues[screen].push(item);
    if ((this.clients[screen] || []).length > 0) {
      this._playNext(screen);
    } else {
      console.log(
        "[LocalOverlay] screen " +
          screen +
          ': no client connected — holding "' +
          item.type +
          '"',
      );
    }
    this.onQueueUpdate(this.getQueueStatus());
  }

  _playNext(screen) {
    if (this.playing[screen]) return;
    const queue = this.queues[screen];
    if (!queue || queue.length === 0) {
      this.playing[screen] = false;
      return;
    }
    const item = queue.shift();
    this.playing[screen] = true;
    this._broadcast(screen, item);
    this._armDoneWatchdog(screen, item);
    this.onQueueUpdate(this.getQueueStatus());
  }

  _armDoneWatchdog(screen, item) {
    if (this.doneTimers[screen]) clearTimeout(this.doneTimers[screen]);
    const timeout = ((item && item.duration ? item.duration : 5) + 20) * 1000;
    this.doneTimers[screen] = setTimeout(() => {
      console.log(
        "[LocalOverlay] screen " +
          screen +
          ": done watchdog fired — unblocking queue",
      );
      this._onMediaDone(screen);
    }, timeout);
  }

  _onMediaDone(screen) {
    screen = String(screen);
    if (this.doneTimers[screen]) {
      clearTimeout(this.doneTimers[screen]);
      this.doneTimers[screen] = null;
    }
    this.playing[screen] = false;
    if ((this.clients[screen] || []).length > 0) {
      this._playNext(screen);
    }
    this.onQueueUpdate(this.getQueueStatus());
  }

  _broadcast(screen, payload) {
    this.clients[screen] = this._writeToClients(this.clients[screen] || [], payload);
  }

  _writeToClients(clients, payload) {
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

  // =========================================================================
  // HTTP handling
  // =========================================================================
  // توثيق موحّد: التوكن في المسار أو في الـ query أو في الـ Referer
  // (صفحات الأوفرلاي/الويدجت بتتحمّل من مسار فيه التوكن فبيتبعت نفسه
  // في Referer لكل طلباتها — نفس الأصل)
  _authed(req, urlObj) {
    if (!this.token) return false;
    if (urlObj.searchParams.get("t") === this.token) return true;
    if (urlObj.searchParams.get("token") === this.token) return true;
    const referer = String(req.headers.referer || "");
    return referer.includes("/" + this.token + "/");
  }

  async _handleRequest(req, res) {
    const urlObj = new URL(
      req.url,
      "http://127.0.0.1:" + (this.port || DEFAULT_PORT),
    );
    const pathname = urlObj.pathname;

    // ملفات الميديا المحلية
    if (pathname.startsWith("/media/")) {
      if (!this._authed(req, urlObj)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      this._serveMedia(req, res, pathname);
      return;
    }

    const parts = pathname.split("/").filter(Boolean);

    // /overlay/<token>/<screen>
    if (parts[0] === "overlay" && parts.length === 3) {
      if (parts[1] !== this.token) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const screen = parseInt(parts[2], 10);
      if (!screen || screen < 1 || screen > TOTAL_SCREENS) {
        res.writeHead(404);
        res.end("Invalid screen");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(this._overlayHTML(String(screen)));
      return;
    }

    // /events/<token>/<screen> — SSE
    if (parts[0] === "events" && parts.length === 3) {
      if (parts[1] !== this.token) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const screen = String(parseInt(parts[2], 10) || "1");
      if (
        parseInt(parts[2], 10) < 1 ||
        parseInt(parts[2], 10) > TOTAL_SCREENS
      ) {
        res.writeHead(404);
        res.end("Invalid screen");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      if (!this.clients[screen]) this.clients[screen] = [];
      const firstClient = this.clients[screen].length === 0;
      this.clients[screen].push(res);
      res.write(":ok\n\n");
      const v = urlObj.searchParams.get("v");
      if (v !== OVERLAY_PAGE_VERSION) {
        res.write("data: " + JSON.stringify({ type: "reload" }) + "\n\n");
      }
      req.on("close", () => {
        this.clients[screen] = (this.clients[screen] || []).filter(
          (c) => c !== res,
        );
      });
      if (firstClient) {
        if (this.playing[screen]) {
          console.log(
            "[LocalOverlay] screen " +
              screen +
              ": client connected — resetting stuck state",
          );
          this.playing[screen] = false;
        }
        if (this.queues[screen] && this.queues[screen].length > 0) {
          setTimeout(() => this._playNext(screen), 600);
        }
      }
      return;
    }

    // /done/<token>/<screen> — الصفحة بتقول إن الميديا خلصت
    if (parts[0] === "done" && parts.length === 3 && req.method === "POST") {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      });
      res.end('{"ok":true}');
      if (parts[1] === this.token) this._onMediaDone(parts[2]);
      return;
    }

    // /widgets/stream — SSE للويدجت
    if (pathname === "/widgets/stream") {
      if (!this._authed(req, urlObj)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });
      this.widgetClients.push(res);
      res.write(":ok\n\n");
      if (this.currentStats) {
        res.write(
          "data: " +
            JSON.stringify({ type: "stats", stats: this.currentStats }) +
            "\n\n",
        );
      }
      req.on("close", () => {
        this.widgetClients = this.widgetClients.filter((c) => c !== res);
      });
      return;
    }

    // /widget/<token>/<name> أو /widgets/<token>/<name> — صفحات الويدجت
    if (
      (parts[0] === "widget" || parts[0] === "widgets") &&
      parts.length >= 3 &&
      pathname !== "/widgets/stream"
    ) {
      if (parts[1] !== this.token) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      await this._serveWidget(req, res, parts.slice(2).join("/"), urlObj);
      return;
    }

    if (pathname === "/" || pathname === "/overlay") {
      res.writeHead(302, { Location: "/overlay/" + (this.token || "x") + "/1" });
      res.end();
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  }

  // يقرأ ملف ويدجت: النسخة المشفرة (.enc) لو موجودة وإلا العادي
  async _readWidgetFile(filePath) {
    if (this.readAsset) {
      try {
        return await this.readAsset(filePath);
      } catch (e) {
        return null;
      }
    }
    try {
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
    } catch (e) {}
    return null;
  }

  async _serveWidget(req, res, rel, urlObj) {
    const ext = path.extname(rel).toLowerCase();
    const widgetsRoot = path.resolve(this.widgetsDir);

    if (!ext || ext === ".html") {
      const name = ext === ".html" ? rel.slice(0, -5) : rel;
      const filePath = path.join(widgetsRoot, name + ".html");
      const insideRoot =
        path.resolve(filePath) === widgetsRoot ||
        path.resolve(filePath).startsWith(widgetsRoot + path.sep);
      if (!insideRoot) {
        res.writeHead(404);
        res.end("Widget not found");
        return;
      }
      const raw = await this._readWidgetFile(filePath);
      if (!raw) {
        res.writeHead(404);
        res.end("Widget not found");
        return;
      }
      let html = raw.toString("utf-8");
      const widgetId = urlObj.searchParams.get("id") || name;
      let config = {};
      try {
        config = (await this.getConfig(widgetId)) || {};
      } catch (e) {
        config = {};
      }
      // الترتيب مهم: الباك سلاش الأول، وبعدين علامات HTML الخطيرة
      // (\u003c/\u003e يمنعوا أي </script> أو وسم يتحقن جوه صفحة الويدجت)
      const injected = JSON.stringify(config)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e");
      html = html.replace("__INITIAL_CONFIG__", () => injected);
      // OBS browser source مش بيبعت Referer — فاتصال SSE بتاع الويدجت كان
      // بيرفضه _authed (Not found) والويدجت عمرها ما تستقبل حدث لايف.
      // حقن التوكن في رابط الاتصال بيخلّي الاتصال ينجح من أي مكان.
      html = html
        .split("/widgets/stream")
        .join("/widgets/stream?t=" + encodeURIComponent(this.token || ""));
      res.writeHead(200, {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      });
      res.end(html);
      return;
    }

    // أصول ثابتة جنب ملفات الويدجت (صور/أصوات/خطوط)
    const assetPath = path.join(widgetsRoot, rel);
    const insideRoot =
      path.resolve(assetPath) === widgetsRoot ||
      path.resolve(assetPath).startsWith(widgetsRoot + path.sep);
    if (!insideRoot) {
      res.writeHead(404);
      res.end("Asset not found");
      return;
    }
    const asset = await this._readWidgetFile(assetPath);
    if (!asset) {
      res.writeHead(404);
      res.end("Asset not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(asset);
  }

  _serveMedia(req, res, pathname) {
    const decoded = decodeURIComponent(pathname.replace("/media/", ""));
    const ext = path.extname(decoded).toLowerCase();
    let stat = null;
    try {
      stat = fs.statSync(decoded);
    } catch (e) {}
    if (!stat || !stat.isFile() || !MIME_TYPES[ext]) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const range = req.headers.range;
    if (range) {
      try {
        const rangeParts = range.replace("bytes=", "").split("-");
        const start = parseInt(rangeParts[0], 10) || 0;
        const end = rangeParts[1]
          ? parseInt(rangeParts[1], 10)
          : stat.size - 1;
        const safeStart = Math.max(0, Math.min(start, stat.size - 1));
        const safeEnd = Math.max(safeStart, Math.min(end, stat.size - 1));
        const length = safeEnd - safeStart + 1;
        res.writeHead(206, {
          "Content-Range": "bytes " + safeStart + "-" + safeEnd + "/" + stat.size,
          "Accept-Ranges": "bytes",
          "Content-Length": length,
          "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
          "Cache-Control": "no-cache",
        });
        fs.createReadStream(decoded, { start: safeStart, end: safeEnd }).pipe(
          res,
        );
        return;
      } catch (e) {
        console.error("[LocalOverlay] range parsing error:", e);
      }
    }
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "no-cache",
      "Accept-Ranges": "bytes",
    });
    fs.createReadStream(decoded).pipe(res);
  }

  // =========================================================================
  // صفحة الأوفرلاي — نفس صفحة النسخة السابقة مع مسارات التوكن الجديدة
  // =========================================================================
  _overlayHTML(screen) {
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
  @keyframes alertBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  .alert-bob img.alert-photo { width: calc(var(--alert-photo-size, 64) * 1px); height: calc(var(--alert-photo-size, 64) * 1px); border-radius: 50%; object-fit: cover; border: 3px solid #d4af37; box-shadow: 0 3px 14px rgba(0, 0, 0, 0.5); }
  .alert-bob .alert-line { display: flex; align-items: center; gap: 7px; filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.9)); }
  .alert-bob .alert-name { font-size: calc(var(--alert-fs, 22) * 1px); font-weight: 800; white-space: nowrap; }
  .alert-bob .alert-sep { color: #d4af37; font-weight: 700; font-size: calc((var(--alert-fs, 22) - 6) * 1px); }
  .alert-bob .alert-msg { font-size: calc((var(--alert-fs, 22) - 3) * 1px); font-weight: 600; color: rgba(255, 255, 255, 0.95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 44vw; }
  .alert-user { font-size: 28px; font-weight: 800; color: #fff; text-shadow: 0 2px 12px rgba(168, 85, 247, 0.7), 0 0 40px rgba(168, 85, 247, 0.3); margin-bottom: 8px; animation: alertPulse 1.5s ease infinite; }
  .alert-text { font-size: 20px; font-weight: 600; color: rgba(255,255,255,0.9); text-shadow: 0 2px 8px rgba(0,0,0,0.5); text-align: center; max-width: 80%; }
  @keyframes alertPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
</style>
</head>
<body>
<div id="stage"></div>
<script>
const SCREEN_ID = '${screen}';
const PAGE_VERSION = '${OVERLAY_PAGE_VERSION}';
const TOKEN = '${this.token || ""}';
const stage = document.getElementById('stage');
let currentTimeout = null;
let ttsQueue = [];
let ttsSpeaking = false;

function notifyDone() {
  fetch('/done/' + TOKEN + '/' + SCREEN_ID, { method: 'POST' }).catch(() => {});
}
function mediaUrl(p) {
  if (!p) return '';
  var isUrl = p.startsWith('http://') || p.startsWith('https://') || p.startsWith('data:');
  if (isUrl) return p;
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
        const warning = document.createElement('div');
        warning.style.cssText = 'position:absolute; top:10px; right:10px; background:rgba(255,0,0,0.9); color:#fff; padding:15px; border-radius:8px; font-family:sans-serif; font-size:16px; z-index:9999; cursor:pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.3);';
        warning.innerHTML = '🔊 <b>الصوت معطل! (Autoplay Blocked)</b><br>يرجى النقر هنا أو في أي مكان على الشاشة لتفعيل الصوت.';
        warning.onclick = () => warning.remove();
        document.body.appendChild(warning);
        setTimeout(() => warning.remove(), 10000);
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

module.exports = LocalOverlayServer;
