require("dotenv").config();
const http = require("http");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { execFile } = require("child_process");
const { promisify } = require("util");
const express = require("express");
const { WebSocketServer, WebSocket } = require("ws");

const StoreService = require("./services/store");
const LicenseService = require("./services/license");
const TikTokService = require("./services/tiktok");
const OverlayServer = require("./services/overlay-server");
const OverlayHttpService = require("./services/overlay-http");
const MediaStore = require("./services/media-store");
const songreq = require("./services/soundcloud");
const PatreonSync = require("./services/patreon-sync");
const EventRunner = require("./services/event-runner");
const defaultGifts = require("../data/gifts");
const googleTtsApi = require("google-tts-api");
const execFileAsync = promisify(execFile);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "::"; // :: يقبل IPv4 + IPv6 (localhost بيتحل أحيانًا لـ ::1)

// مفتاح Firebase لازم يكون في البيئة — من غيره الترخيص كله واقف
if (!process.env.FIREBASE_WEB_API_KEY) {
  console.error(
    "=========================================================\n" +
      "FIREBASE_WEB_API_KEY مش موجود — ضيفه في ملف .env\n" +
      "(شوف .env.example) ومتشفرش المفتاح في الكود\n" +
      "=========================================================",
  );
  process.exit(1);
}

const app = express();
// CORS مقيد: التطبيق الديسكتوب (Node fetch) مبيبعتش Origin خالص،
// وأي Origin تاني (موقع من متصفح المستخدم) بيرفض — يمنع سرقة التوكنات
// عبر صفحات ويب خبيثة تنادي الـ API المحلي (drive-by)
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:7330",
  "eldaly://app", // تطبيق الديسكتوب — رفع الميديا
  "null",
]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    // نفس الأصل (صفحات الويدجت على نفس الدومين) — مش محتاجين CORS، بيعدّوا طولًا
    // المتصفح بيبعت Origin مع POST حتى لو same-origin فلازم نسمح بيهم هنا
    const host = req.headers.host || "";
    const sameOrigin =
      origin === "http://" + host || origin === "https://" + host;
    if (!sameOrigin && !ALLOWED_ORIGINS.has(origin)) {
      return res.status(403).json({ ok: false, reason: "forbidden origin" });
    }
    if (!sameOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,x-app-session,x-app-hwid,x-overlay-token",
      );
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
  }
  next();
});
// حد الجسم: كوافي لوويدجت كونفج كبيرة ومنع DoS بالذاكرة
const BODY_LIMIT = "10mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));

// مقارنة أسرار بثبات زمني — تمنع استنتاج التوكن حرف بحرف
function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// ======== تأمين عام ========
// هيدرز أمان أساسية لكل الردود
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// حماية من brute-force وإغراق السيرفر — بدون مكتبات خارجية
// العد على IP المستخدم الحقيقي: خلف بروكسي Render بناخد آخر IP في
// X-Forwarded-For (Render بيضيف الـ IP الحقيقي في آخر السلسلة، فمش قابل للتزوير)،
// ولو مفيش بروكسي نرجع لعنوان السوكيت مباشرة
function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return req.socket.remoteAddress || "unknown";
}

// مصنع عدادات: عداد لكل IP بنافذة زمنية — بعد الحد بيرجع 429 مع rateLimited:true
// (rateLimited بتساعد التطبيق يفرق بين "استنى شوية" و"جلسة انتهت")
function makeRateLimiter(max, windowMs, message) {
  const attempts = new Map();
  const limiter = (req, res, next) => {
    const ip = clientIp(req);
    const now = Date.now();
    let entry = attempts.get(ip);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, count: 0 };
      attempts.set(ip, entry);
    }
    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ ok: false, rateLimited: true, reason: message });
    }
    next();
  };
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of attempts) {
      if (now - entry.start > windowMs) attempts.delete(ip);
    }
  }, windowMs).unref();
  return limiter;
}

const QUARTER_HOUR_MS = 15 * 60 * 1000;

// تسجيل الدخول/التسجيل/الباسورد: 5 محاولات كل ربع ساعة لكل IP — يمنع تخمين الباسورد
const authRateLimiter = makeRateLimiter(
  5,
  QUARTER_HOUR_MS,
  "محاولات كتير — استنى ربع ساعة وحاول تاني",
);
// الويبهوك والسكوربورد الخارجيين بيشتغلوا أثناء البث، فحد تسجيل الدخول
// (5 محاولات/ربع ساعة) كان بيوقفهم بعد كام ضغطة.
const externalActionRateLimiter = makeRateLimiter(
  300,
  QUARTER_HOUR_MS,
  "طلبات خارجية كتير — استنى شوية وحاول تاني",
);
// استعادة الجلسة: برنامج الديسكتوب بيستدعيها كل دقيقتين ونص (watchdog) —
// فالحد ليها منفصل وأعلى: 15 كل ربع ساعة لكل IP (يكفي دورة طبيعية + هامش)
const sessionRateLimiter = makeRateLimiter(
  15,
  QUARTER_HOUR_MS,
  "محاولات كتير — البرنامج هيعيد المحاولة لوحده بعد شوية",
);
// درع عام ضد إغراق السيرفر: أي مسار /api عدا /api/health (فحوصات Render والنبضة)
// 600/ربع ساعة لكل IP — بستوعب البرامج القديمة اللي بتعمل polling سريع
// (3 ثواني = 300/ربع ساعة) ويفضل قاتل حقيقي لأي محاولة إغراق
const apiUmbrellaLimiter = makeRateLimiter(
  600,
  QUARTER_HOUR_MS,
  "طلبات كتير جداً — استنى شوية وحاول تاني",
);
app.use("/api", (req, res, next) => {
  if (req.path === "/health") return next();
  return apiUmbrellaLimiter(req, res, next);
});

const server = http.createServer(app);
// مهلات ضد اتصالات البطء (slow-loris): لو عميل فتح socket ومبعتش هيدرز كاملة
// خلال دقيقة بيتقفل — ومفيش اتصال عايش بلا فايدة لأكتر من دقيقة وسكند
server.headersTimeout = 60000;
server.keepAliveTimeout = 65000;
const wss = new WebSocketServer({ server, path: "/ws" });

const store = new StoreService();
const licenseService = new LicenseService(store);
const tiktokService = new TikTokService();
const overlayServer = new OverlayServer(store);
const mediaStore = new MediaStore();
const patreonSync = new PatreonSync();

// ===== الأوفرلاي السحابي: OBS بيحمّل الصفحات من السيرفر مباشرة بتوكن الحساب =====
let currentOverlayToken = null; // بتتحدّث عند كل login/register/restore
const overlayHttp = new OverlayHttpService({
  store,
  widgetsDir: path.join(__dirname, "widgets"),
  getToken: () => currentOverlayToken,
});
overlayHttp.register(app);

// رفع الميديا للسحابة — قبل ميدل وير الـ JSON عشان الجسم الخام
// (بيتحقق من الجلسة بنفسه لأنه متسجل قبل ميدل وير الحماية)
// حد الرفع: 30 ملف كل 10 دقايق لكل IP — يمنع استغلال التخزين
const mediaRate = new Map();
function mediaRateGate(req, res) {
  const ip = clientIp(req);
  const now = Date.now();
  let e = mediaRate.get(ip);
  if (!e || now - e.start > 600000) { e = { start: now, count: 0 }; mediaRate.set(ip, e); }
  e.count++;
  if (e.count > 30) { res.status(429).json({ ok: false, error: "too many uploads — wait a bit" }); return false; }
  return true;
}

app.post(
  "/api/media/upload",
  express.raw({ type: () => true, limit: "220mb" }),
  async (req, res) => {
    try {
      if (!mediaRateGate(req, res)) return;
      const sess = req.headers["x-app-session"];
      if (
        !sess ||
        !appSession.token ||
        !safeEqual(sess, appSession.token) ||
        (appSession.hwid && !safeEqual(req.headers["x-app-hwid"], appSession.hwid))
      ) {
        return res.status(401).json({ ok: false, error: "unauthorized" });
      }
      if (!mediaStore.enabled) {
        return res.status(503).json({ ok: false, error: "media storage not configured" });
      }
      const name = String(req.query.name || "file.bin");
      const result = await mediaStore.upload(req.body, name);
      res.status(result.ok ? 200 : 400).json(result);
    } catch (err) {
      console.error("[MediaUpload]", err.message);
      res.status(500).json({ ok: false, error: "upload failed" });
    }
  }
);

const eventRunner = new EventRunner(
  store,
  overlayServer,
  tiktokService,
  licenseService,
);

// مزامنة البيانات مع قاعدة البيانات السحابية باستخدام توكن المستخدم
store.getToken = () => licenseService.getIdToken();

// جلسة التطبيق: كل API (عدا المسارات العامة) محتاجة التوكن ده في هيدر
// x-app-session — بيتولد بعد تسجيل الدخول وبيتبعت للفرونت في الرد.
// الجلسة مربوطة كمان بجهاز (hwid) — التوكن المسروح من أي جهاز تاني مبيشتغلش.
let appSession = { token: null, email: null, hwid: null, lastSeen: 0 };
// حماية التشغيل من مكانين: آخر جهاز فعّال هو المسيطر بالحساب،
// والجهاز اللي اتطرد بيتعلم هنا عشان يترفض فوراً (403 kicked) بدل ما
// يرجع يعمل restore ويسرق الجلسة تاني (منع الـ ping-pong)
let kickedSession = null; // { token, at }
let connectOwner = null; // { hwid, email } — مين شايل كونكت التيك توك الحالي
const KICK_WINDOW_MS = 10 * 60 * 1000; // المطروود يترفض لمدة 10 دقايق
const ACTIVE_WINDOW_MS = 90 * 1000; // الجهاز النشيط في آخر 90 ثانية = مسيطر

// ═══ فرض الحالة الرسمية للحساب على الجلسة الشغالة ═══
// الحظر/حظر الجهاز/انتهاء الاشتراك مكانش بيتفعل غير عند login/restore —
// يعني عميل معدّل شايل توكن صحيح كان بيكمل شغال بعد الحظر! دلوقتي السيرفر
// بيجلّب الحالة كل 60 ثانية وبيفرضها على كل طلب (حظر = قفل فوري شامل)
let sessionUserCache = { at: 0, email: null, data: null };
let sessionUserRefreshing = false;
async function refreshSessionUserDoc() {
  if (sessionUserRefreshing || !appSession.email) return;
  sessionUserRefreshing = true;
  try {
    const data = await licenseService.refreshSessionUser();
    if (data && data.user) sessionUserCache = { at: Date.now(), email: appSession.email, data };
  } catch (e) {} finally { sessionUserRefreshing = false; }
}
function enforceSessionUser(res) {
  const data = sessionUserCache.email === appSession.email ? sessionUserCache.data : null;
  if (!data) return true;
  const kill = (reason) => {
    try { tiktokService.disconnect(); } catch (e) {}
    clearAppSession();
    res.status(403).json({ ok: false, kicked: true, reason });
    return false;
  };
  if (data.hwidBanned) return kill("الجهاز محظور من الإدارة");
  const u = data.user;
  if (u && (u.banned || u.deleted)) return kill("الحساب محظور من الإدارة");
  return true;
}

function mintAppSession(email, hwid) {
  // عزل نظام الأغاني: كل حساب ليه طابور وتاريخ منفصلين
  if (typeof songreq !== "undefined") songreq.setAccount(email);
  const clean = String(email).toLowerCase();
  const device = String(hwid || "");
  // نفس الحساب + نفس الجهاز = نفس الجلسة (عشان الـ watchdog كل 150 ثانية
  // ميلفّش التوكن ويقطع الـ WebSocket شغال)
  if (
    appSession.token &&
    appSession.email === clean &&
    appSession.hwid === device
  ) {
    appSession.lastSeen = Date.now();
    return appSession.token;
  }
  // الأول على الشجرة: الجهاز النشيط بيكمّل شغال ومش بيتطرد أبدًا —
  // أي جهاز تاني بيترفض بدل ما يسرق الجلسة ويقفل البرنامج في وش العميل
  if (activeSessionOnOtherDevice(clean, device)) return null;
  // الجهاز الشغال قام بدري/سايب (مفيش lastSeen حديث)؟ الجهاز الجديد ياخد الجلسة
  if (appSession.token && appSession.email === clean && appSession.hwid !== device) {
    kickedSession = { token: appSession.token, at: Date.now() };
    for (const client of wsClients) {
      if (client._appSession === appSession.token) {
        try {
          client.close(4401, "opened elsewhere");
        } catch (e) {}
      }
    }
    if (connectOwner && connectOwner.hwid === appSession.hwid) {
      try {
        tiktokService.disconnect();
      } catch (e) {}
      connectOwner = null;
      broadcastToWsClients("connection-status", { status: "disconnected" });
    }
  }
  appSession = {
    token: crypto.randomBytes(24).toString("hex"),
    email: clean,
    hwid: device,
    lastSeen: Date.now(),
  };
  return appSession.token;
}

// فيه جهاز نشيط دلوقتي شايل الجلسة على نفس الحساب من جهاز مختلف؟
// النشيط = بيبعت طلبات (lastSeen أحدث من ACTIVE_WINDOW_MS)
function activeSessionOnOtherDevice(email, hwid) {
  return !!(
    appSession.token &&
    appSession.email === String(email || "").toLowerCase() &&
    appSession.hwid !== String(hwid || "") &&
    Date.now() - (appSession.lastSeen || 0) < ACTIVE_WINDOW_MS
  );
}

// العملية الحالية فيها Store/License/TikTok واحد فقط؛ السماح لحساب مختلف
// باستبدال الجلسة هنا يخلط بيانات الحسابين. نرفضه بدل استبدال الحالة بصمت.
function activeSessionOnOtherAccount(email) {
  const clean = String(email || "").trim().toLowerCase();
  return !!(
    appSession.token &&
    appSession.email &&
    clean &&
    appSession.email !== clean
  );
}

function clearAppSession() {
  const old = appSession.token;
  appSession = { token: null, email: null, hwid: null, lastSeen: 0 };
  connectOwner = null;
  if (old) {
    // اقفل أي WebSocket فاتح بالجلسة دي
    for (const client of wsClients) {
      if (client._appSession === old) {
        try {
          client.close(4401, "session ended");
        } catch (e) {}
      }
    }
  }
}

const PUBLIC_API_PATHS = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/reset-password",
  "/api/auth/restore-session",
  "/api/auth/check-session",
  "/api/auth/release-session",
  "/api/auth/payment-links",
  "/api/auth/state",
  "/api/auth/tier",
  "/api/system/sounds",
];
function isPublicApiPath(p) {
  return (
    PUBLIC_API_PATHS.includes(p) ||
    p.startsWith("/api/webhook/") ||
    p.startsWith("/api/scoreboard")
  );
}
// ======== حماية مسارات الأغاني ========
// مش عامة زي زمان — بتقبل واحدة من اتنين:
//   1) جلسة التطبيق (x-app-session + hwid) زي باقي الـ API — لوحة التحكم
//   2) توكن الأوفرلاي بتاع الحساب (x-overlay-token أو ?t=) — صفحات الويدجت في OBS
// العداد (40/ربع ساعة) على طلبات التوكن فقط — لأن برنامج الديسكتوب بيستفتح
// الحالة كل شوية لوحده فلو اتحسب هيضرب الحد ويخلي الطابور يختفي ويظهر.
// جلسة التطبيق تعدّي من العداد (والدرع العام 300/ربع ساعة يحمي برضه).
app.use("/api/songs", (req, res, next) => {
  const header = req.headers["x-app-session"];
  const device = req.headers["x-app-hwid"];
  const sessionOk =
    !!header &&
    !!appSession.token &&
    safeEqual(header, appSession.token) &&
    (!appSession.hwid || safeEqual(device, appSession.hwid));
  if (sessionOk) return next();
  return songsLimiter(req, res, next);
});
const songsLimiter = makeRateLimiter(
  40,
  QUARTER_HOUR_MS,
  "محاولات كتير — استنى شوية وحاول تاني",
);

function overlayTokenOk(req) {
  const token = String(req.headers["x-overlay-token"] || req.query.t || "");
  return (
    !!currentOverlayToken && !!token && safeEqual(token, currentOverlayToken)
  );
}

app.use((req, res, next) => {
  if (!req.path.startsWith("/api") || isPublicApiPath(req.path)) return next();
  const header = req.headers["x-app-session"];
  const device = req.headers["x-app-hwid"];
  // الجهاز المطروود (اتخذ مكانه جهاز تاني): رفض فوري بأمر kicked —
  // التطبيق عنده يفهم ويقفل كل حاجة بدل ما يحاول يعمل restore ويسرق الجلسة
  if (
    header &&
    kickedSession &&
    kickedSession.token === header &&
    Date.now() - kickedSession.at < KICK_WINDOW_MS
  ) {
    return res.status(403).json({
      ok: false,
      kicked: true,
      reason: "الحساب مفتوح على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة",
    });
  }
  const sessionOk =
    !!header &&
    !!appSession.token &&
    safeEqual(header, appSession.token) &&
    (!appSession.hwid || safeEqual(device, appSession.hwid));
  if (sessionOk) {
    appSession.lastSeen = Date.now();
    // فرض الحالة الرسمية: حظر الحساب/الجهاز أو انتهاء الاشتراك بيتفعل خلال ≤ دقيقة
    if (Date.now() - sessionUserCache.at > 60000) refreshSessionUserDoc();
    if (!enforceSessionUser(res)) return;
    return next();
  }
  // مسارات الأغاني بس اللي بتقبل توكن الأوفرلاي كبديل للجلسة
  if (req.path.startsWith("/api/songs/") && overlayTokenOk(req)) return next();
  return res.status(401).json({ ok: false, reason: "unauthorized" });
});

// WebSocket clients tracking
const wsClients = new Set();
// آخر وقت اتبعتت فيه إشارة "الأغنية خلصت" — لحماية التكرار (شوف معالج الضيوف)
let lastTrackEndedAt = 0;

// ===== نظام طلبات الأغاني — ساوند كلاود =====
const DEFAULT_SONG_SETTINGS = {
  enabled: true,
  playEnabled: true,
  playCost: 0,
  skipEnabled: true,
  skipCost: 1,
  allowSkipRequested: true,
  allowExplicit: true,
  maxQueue: 20,
  maxQueuePerUser: 2,
  overlayPermanent: true,
  volume: 80,
  fallbackUrl: "",
  allowedFor: { all: true, subs: false, mods: true },
  pointsPerMessage: 1,
};
function songSettings() {
  return { ...DEFAULT_SONG_SETTINGS, ...(store.get("songs.settings") || {}) };
}
function saveSongSettings(patch) {
  const merged = { ...songSettings(), ...(patch || {}) };
  store.set("songs.settings", merged);
  return merged;
}
function songFeed(username, text) {
  broadcastRaw({ topic: "event", event: { type: "song", text: username + " — " + text } });
}
// بث الأغاني للاتنين في نفس اللحظة:
//   broadcastRaw → WS (صفحة تحكم الأغاني في OBS)
//   overlayHttp.handleSongEvent → SSE (مشغل overlay-music السحابي)
// كده الصوت/المقاس/الطابور بيتنفذوا لحظيًا على كل الصفحات من غير polling
function broadcastSongs(obj) {
  broadcastRaw(obj);
  overlayHttp.handleSongEvent(obj);
}
songreq.init(broadcastSongs, () => ({ songrequests: songSettings() }));

function handleSongCommands(username, badges, content) {
  const sr = songSettings();
  if (!sr.enabled) return;
  songreq.earnPoints(username); // كسب نقاط الولاء من التفاعل
  const text = String(content || "").trim();
  const lower = text.toLowerCase();
  const badgeSet = new Set(badges || []);
  const isMod = badgeSet.has("moderator") || badgeSet.has("staff");
  const isBroadcaster = badgeSet.has("broadcaster");
  const isSub = badgeSet.has("subscriber");
  const canUse =
    isBroadcaster || sr.allowedFor?.all || (sr.allowedFor?.subs && isSub) || (sr.allowedFor?.mods && isMod);
  const argOf = (...cmds) => {
    for (const c of cmds) {
      if (lower === c) return "";
      if (lower.startsWith(c + " ")) return text.slice(c.length + 1).trim();
    }
    return null;
  };
  const playArg = argOf("!play", "!song", "!request");
  if (playArg !== null) {
    if (!sr.playEnabled) return songFeed(username, "طلب الأغاني مقفول حالياً");
    if (!canUse) return songFeed(username, "أمر طلب الأغاني مش متاح لحسابك");
    if (!playArg) return songFeed(username, "اكتب اسم الأغنية أو لينك ساوند كلاود بعد الأمر");
    songreq
      .addTrack(username, playArg)
      .then((t) => songFeed(username, "تمت الإضافة: " + t.title + " - " + t.artist))
      .catch((e) => songFeed(username, e.message));
    return;
  }
  if (argOf("!skip") !== null) {
    if (!sr.skipEnabled) return songFeed(username, "أمر التخطي مقفول");
    if (!canUse) return songFeed(username, "أمر التخطي مش متاح لحسابك");
    const r = songreq.skip(username, false);
    return songFeed(username, r.ok ? "تم تخطي الأغنية" : r.error);
  }
  if (lower === "!revoke") {
    const r = songreq.revoke(username);
    return songFeed(username, r.ok ? "تم إلغاء: " + r.removed.title : r.error);
  }
  if (lower === "!queue" || lower === "!songqueue") {
    const st = songreq.queueState();
    const lines = [];
    if (st.current) lines.push("الآن: " + st.current.title + " - " + st.current.artist);
    st.queue.slice(0, 5).forEach((q, i) => lines.push(i + 1 + ". " + q.title + " - " + q.artist + " (" + q.requestedBy + ")"));
    return songFeed(username, lines.length ? lines.join(" | ") : "الطابور فاضي — ابعت !play لينك أو اسم أغنية");
  }
  if (lower === "!points") {
    return songFeed(username, "نقاطك: " + songreq.getPoints(username));
  }
}
tiktokService.on("chat", (c) =>
  handleSongCommands(c.user || c.uniqueId, c.badges || [], c.comment)
);



// بث خام — رسائل {topic:...} لصفحات الأوفرلاي (الأغاني)
// الضيوف (صفحات ويدجت الأغاني في OBS): مواضيع الأغاني فقط وبتوكن أوفرلاي
// مطابق لتوكن الحساب — أي زائر من غير توكن مش بياخد أي حاجة
const GUEST_SONG_TOPICS = new Set([
  "songqueue",
  "songstate",
  "songhistory",
  "sr-settings",
  "sr-control",
]);
function broadcastRaw(obj) {
  const m = JSON.stringify(obj);
  for (const client of wsClients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (client._guest) {
      if (
        GUEST_SONG_TOPICS.has(obj.topic) &&
        client._overlayToken &&
        currentOverlayToken &&
        safeEqual(client._overlayToken, currentOverlayToken)
      ) {
        try { client.send(m); } catch (e) {}
      }
      continue;
    }
    try { client.send(m); } catch (e) {}
  }
}

function broadcastToWsClients(type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  for (const client of wsClients) {
    if (client._guest) continue; // أحداث التطبيق للجلسات المسجلة بس — مش للضيوف
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(msg);
      } catch (e) {}
    }
  }
}

wss.on("connection", (ws, req) => {
  // سقف إجمالي للاتصالات — إغراق WS بيستهلك ذاكرة السيرفر، فأي اتصال زائد بيرفض فوراً
  if (wsClients.size >= 500) {
    try { ws.close(1013, "server busy"); } catch (e) {}
    return;
  }
  // الـ WebSocket نفسه محتاج جلسة صالحة + نفس الجهاز — من غيرها مفيش أحداث
  let sessionParam = null;
  let hwidParam = null;
  try {
    const params = new URL(req.url, "http://127.0.0.1").searchParams;
    sessionParam = params.get("session");
    hwidParam = params.get("hwid");
  } catch (e) {}
  const hwidOk =
    !appSession.hwid || (hwidParam && safeEqual(hwidParam, appSession.hwid));
  const sessionOk =
    appSession.token && safeEqual(sessionParam, appSession.token) && hwidOk;
  if (!sessionOk) {
    // زائر ويدجت الأغاني (songs-page في OBS) — بياخد بث الأغاني فقط
    // لو معاه توكن أوفرلاي مطابق للحساب، ومينفعش يبعت غير إشارة انتهاء أغنية
    // وبرضه بتوكن صالح
    ws._guest = true;
    // مهم: الضيوف كمان لازم يتتابع ping/pong — من غير السطور دي فحص الحياة
    // كان بيقطع اتصالهم كل 30-60 ثانية ويوقف تحديث صفحة الأغاني
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
    try { ws._overlayToken = new URL(req.url, "http://x").searchParams.get("overlay") || ""; } catch(e) {}
    wsClients.add(ws);
    // قفل سبام الرسائل: أكتر من 30 رسالة في 10 ثواني = اتصال خبيث، بيتقفل
    let msgWin = Date.now();
    let msgCount = 0;
    ws.on("message", (raw) => {
      const now = Date.now();
      if (now - msgWin > 10000) { msgWin = now; msgCount = 0; }
      msgCount++;
      if (msgCount > 30) {
        try { ws.close(1008, "message flood"); } catch (e) {}
        return;
      }
      try {
        const m = JSON.parse(raw);
        if (
          m.type === "trackEnded" &&
          ws._overlayToken &&
          currentOverlayToken &&
          safeEqual(ws._overlayToken, currentOverlayToken)
        ) {
          // حماية من التكرار: لو أكتر من صفحة أوفرلاي مفتوحة (OBS + متصفح)
          // كلهم هيبعتوا "خلصت" في نفس اللحظة — ناخد أول واحدة بس كل 5 ثواني
          // عشان مش نطفر أغنية زيادة في الطابور
          if (now - lastTrackEndedAt > 5000) {
            lastTrackEndedAt = now;
            songreq.trackEnded();
          }
        }
      } catch (e) {}
    });
    ws.on("close", () => wsClients.delete(ws));
    return;
  }
  ws._appSession = appSession.token;
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  wsClients.add(ws);
  console.log(
    `[WS] Client connected from ${req.socket.remoteAddress}. Total: ${wsClients.size}`,
  );

  ws.send(
    JSON.stringify({
      type: "init",
      data: {
        connected: tiktokService.isConnected(),
        username: tiktokService.username,
        stats: eventRunner.globalStats,
        scoreboard: eventRunner.scoreboardState,
        timer: eventRunner.getTimerState(),
        tier: licenseService.currentTier || "free",
      },
    }),
  );

  ws.on("message", (raw) => {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    wsClients.delete(ws);
    console.log(`[WS] Client disconnected. Remaining: ${wsClients.size}`);
  });
});

// Forward EventRunner events to WebSocket clients
eventRunner.on("log", (msg) => broadcastToWsClients("log", msg));

// heartbeat: اقفل أي socket ميت (عميل اختفى من غير close) — يمنع تراكم الاتصالات
const WS_HEARTBEAT_MS = 30000;
const wsHeartbeat = setInterval(() => {
  for (const client of wsClients) {
    if (client.isAlive === false) {
      try {
        client.terminate();
      } catch (e) {}
      wsClients.delete(client);
      continue;
    }
    client.isAlive = false;
    try {
      client.ping();
    } catch (e) {}
  }
}, WS_HEARTBEAT_MS);
wsHeartbeat.unref();

const runnerEvents = [
  "connection-status",
  "tiktok:chat",
  "tiktok:gift",
  "tiktok:like",
  "tiktok:follow",
  "tiktok:join",
  "tiktok:share",
  "tiktok:subscribe",
  "tiktok:streamEnd",
  "tiktok:error",
  "ext:scoreboard:state",
  "ext:timer:state",
  "play-local-tts",
  "client:pressKeys",
  "client:minecraft",
  "stats:update",
];

for (const ev of runnerEvents) {
  eventRunner.on(ev, (data) => broadcastToWsClients(ev, data));
}

// التيك توك قافل البث من عندها (streamEnd): فضّ ملكية الكونكت
// وسجّل مدة وكوينز الجلسة في الإحصائيات الشهرية
eventRunner.on("tiktok:streamEnd", () => {
  connectOwner = null;
  licenseService?.setLive(false, eventRunner.globalStats.totalCoins || 0);
});

// كل أحداث الأوفرلاي/الويدجت بتنشر في اتجاهين: تطبيق الديسكتوب (WebSocket)
// + صفحات OBS السحابية مباشرة (SSE) — نفس الحدث يوصل للاتنين
overlayServer.setForward((type, payload) => {
  broadcastToWsClients(type, payload);
  overlayHttp.handleEvent(type, payload);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.3.11",
    uptime: process.uptime(),
    tiktokConnected: tiktokService.isConnected(),
    wsClients: wsClients.size,
  });
});

// ==========================================
// AUTH & LICENSE ROUTES
// ==========================================
// حدود التيرات والويدجت البريميوم — بتتقري من قاعدة البيانات (config/limits)
// عشان تغييرها محتاجش deploy. اللي هنا مجرد قيم افتراضية لو الدوكيومنت مش موجود.
// شكل الدوكيومنت في Firestore:
//   config/limits → tiers: (JSON string) { free: {label,profiles,actions,overlay,premiumWidgets}, ... }
//                   premiumWidgets: (JSON string) ["battle", ...]
const DB_ROOT =
  "https://firestore.googleapis.com/v1/projects/" +
  (process.env.FIREBASE_PROJECT_ID || "eldaly-stream") +
  "/databases/(default)/documents";
const DEFAULT_TIER_LIMITS = {
  free: {
    label: "Free",
    profiles: 1,
    actions: 7,
    overlay: true,
    premiumWidgets: false,
  },
  normal: {
    label: "Pro",
    profiles: 9999,
    actions: 9999,
    overlay: true,
    premiumWidgets: true,
  },
  pro: {
    label: "Pro",
    profiles: 9999,
    actions: 9999,
    overlay: true,
    premiumWidgets: true,
  },
  vip: {
    label: "VIP",
    profiles: 9999,
    actions: 9999,
    overlay: true,
    premiumWidgets: true,
  },
};
const DEFAULT_PREMIUM_WIDGETS = [
  "battle",
  "battle-royale",
  "auction",
  "firework",
  "gift-spinner",
  "scoreboard",
];
let TIER_LIMITS = JSON.parse(JSON.stringify(DEFAULT_TIER_LIMITS));
let PREMIUM_WIDGETS = [...DEFAULT_PREMIUM_WIDGETS];

let _limitsWarned = false;
async function loadLimitsFromDb() {
  try {
    const res = await fetch(DB_ROOT + "/config/limits", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const fields = ((await res.json()) || {}).fields || {};
    const readStr = (f) => (f && f.stringValue) || "";
    const tiersRaw = readStr(fields.tiers);
    const premiumRaw = readStr(fields.premiumWidgets);
    if (tiersRaw) {
      const parsed = JSON.parse(tiersRaw);
      if (parsed && typeof parsed === "object" && parsed.free) {
        TIER_LIMITS = parsed;
      }
    }
    if (premiumRaw) {
      const parsed = JSON.parse(premiumRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        PREMIUM_WIDGETS = parsed.map(String);
      }
    }
  } catch (e) {
    // أول مرة بس نطبع التحذير — بعدين في تحديثات كل 5 دقايق بالسكتة
    if (!_limitsWarned) {
      _limitsWarned = true;
      console.log(
        "[Limits] config/limits مش موجود في الداتابيز — مستخدم الافتراضي (" +
          e.message +
          ")",
      );
    }
  }
}
setInterval(loadLimitsFromDb, 300000).unref(); // تحديث كل 5 دقايق

function getTierLimits() {
  const tier = (licenseService && licenseService.currentTier) || "free";
  return { tier, ...(TIER_LIMITS[tier] || TIER_LIMITS.free) };
}

app.post("/api/auth/register", authRateLimiter, async (req, res) => {
  const { email, password, hwid } = req.body || {};
  if (activeSessionOnOtherAccount(email)) {
    return res.status(409).json({
      ok: false,
      conflict: true,
      reason: "حساب آخر مفتوح على نفس السيرفر — اقفل الجلسة الحالية أولاً",
    });
  }
  // الجهاز الشغال الأول هو المسيطر — الجهاز التاني بيترفض ومش بيتسرق الجلسة
  if (activeSessionOnOtherDevice(email, hwid)) {
    return res.status(403).json({
      ok: false,
      conflict: true,
      reason:
        "الحساب مفتوح حالياً على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة وحاول تاني",
    });
  }
  const result = await licenseService.register(email, password, hwid);
  if (result.ok && result.email) {
    await store.setAccount(result.email, licenseService.lastIdToken);
    result.sessionToken = mintAppSession(result.email, hwid);
    if (result.overlayToken) currentOverlayToken = result.overlayToken;
  }
  res.json(result);
});

app.post("/api/auth/login", authRateLimiter, async (req, res) => {
  const { email, password, hwid } = req.body || {};
  if (activeSessionOnOtherAccount(email)) {
    return res.status(409).json({
      ok: false,
      conflict: true,
      reason: "حساب آخر مفتوح على نفس السيرفر — اقفل الجلسة الحالية أولاً",
    });
  }
  // الجهاز الشغال الأول هو المسيطر — الجهاز التاني بيترفض ومش بيتسرق الجلسة
  // (البرنامج اللي شغال مش بيتقفل في وش العميل خالص)
  if (activeSessionOnOtherDevice(email, hwid)) {
    return res.status(403).json({
      ok: false,
      conflict: true,
      reason:
        "الحساب مفتوح حالياً على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة وحاول تاني",
    });
  }
  const result = await licenseService.login(email, password, hwid);
  if (result.ok && result.email) {
    await store.setAccount(result.email, licenseService.lastIdToken);
    result.sessionToken = mintAppSession(result.email, hwid);
    if (result.overlayToken) currentOverlayToken = result.overlayToken;
    if (patreonSync.isOwner(result.email)) {
      patreonSync.start(licenseService, (msg) => eventRunner.log(msg));
    }
  }
  res.json(result);
});

app.post("/api/auth/reset-password", authRateLimiter, async (req, res) => {
  const { email } = req.body || {};
  const result = await licenseService.sendPasswordReset(email);
  res.json(result);
});

app.post("/api/auth/change-password", async (req, res) => {
  const { password } = req.body || {};
  const result = await licenseService.changePassword(password);
  res.json(result);
});

app.post("/api/auth/restore-session", sessionRateLimiter, async (req, res) => {
  const { hwid } = req.body || {};
  // الحساب شغال دلوقتي ونشيط على جهاز آخر؟ آخر جهاز هو المسيطر —
  // الجهاز القديم ممنوع ياخد الجلسة تاني غير لما التاني يهدى (يتقفل)
  if (
    appSession.token &&
    appSession.email &&
    String(hwid || "") !== appSession.hwid &&
    Date.now() - (appSession.lastSeen || 0) < ACTIVE_WINDOW_MS
  ) {
    return res.status(403).json({
      ok: false,
      kicked: true,
      reason:
        "الحساب شغال حالياً على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة وحاول تاني",
    });
  }
  const result = await licenseService.restoreSession(hwid);
  if (result.loggedIn && result.email) {
    await store.setAccount(result.email, licenseService.lastIdToken);
    result.sessionToken = mintAppSession(result.email, hwid);
    if (result.overlayToken) currentOverlayToken = result.overlayToken;
    if (patreonSync.isOwner(result.email)) {
      patreonSync.start(licenseService, (msg) => eventRunner.log(msg));
    }
  }
  res.json(result);
});

// فحص سريع كل 30 ثانية من التطبيق: جلستي لسه صالحة ولا حصل استيلاء؟
app.get("/api/auth/check-session", (req, res) => {
  const header = req.headers["x-app-session"];
  if (
    header &&
    kickedSession &&
    kickedSession.token === header &&
    Date.now() - kickedSession.at < KICK_WINDOW_MS
  ) {
    return res.status(403).json({
      ok: false,
      kicked: true,
      reason: "الحساب مفتوح على جهاز آخر — اقفل الجهاز التاني أو استنى دقيقة",
    });
  }
  if (!header || !appSession.token || !safeEqual(header, appSession.token)) {
    return res.status(401).json({ ok: false });
  }
  appSession.lastSeen = Date.now();
  if (Date.now() - sessionUserCache.at > 60000) refreshSessionUserDoc();
  if (!enforceSessionUser(res)) return;
  res.json({ ok: true });
});

// الجهاز بيقفل البرنامج: بيسيب الجلسة عشان يقدر يفتح من جهاز تاني فوراً
app.post("/api/auth/release-session", authRateLimiter, (req, res) => {
  const { hwid } = req.body || {};
  if (
    appSession.token &&
    appSession.hwid &&
    appSession.hwid === String(hwid || "")
  ) {
    for (const client of wsClients) {
      if (client._appSession === appSession.token) {
        try {
          client.close(1000, "bye");
        } catch (e) {}
      }
    }
    appSession = { token: null, email: null, hwid: null, lastSeen: 0 };
  }
  res.json({ ok: true });
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    if (tiktokService.isConnected()) tiktokService.disconnect();
  } catch (err) {}
  await licenseService.logout();
  store.clearAccount();
  patreonSync.stop();
  clearAppSession();
  res.json({ ok: true });
});

app.get("/api/auth/state", (req, res) => {
  const limits = getTierLimits();
  // الإيميل معلومة خاصة — بتظهر بس لصاحب الجلسة الصالح
  const header = req.headers["x-app-session"];
  const authed = !!appSession.token && safeEqual(header, appSession.token);
  res.json({
    tier: limits.tier,
    label: limits.label,
    profiles: limits.profiles,
    actions: limits.actions,
    overlay: limits.overlay,
    premiumWidgets: limits.premiumWidgets,
    accountEmail: authed ? licenseService.sessionEmail || null : null,
    expiresAt: authed ? licenseService.sessionExpiresAt || null : null,
  });
});

app.get("/api/auth/tier", (req, res) => {
  res.json({ tier: licenseService.currentTier || "free" });
});

app.get("/api/auth/payment-links", async (req, res) => {
  const links = await licenseService.getPaymentLinks();
  res.json(links);
});

app.post("/api/auth/set-live", async (req, res) => {
  const { isLive } = req.body || {};
  await licenseService.setLive(!!isLive);
  res.json({ ok: true });
});

// ==========================================
// TIKTOK ROUTES
// ==========================================
app.post("/api/tiktok/connect", async (req, res) => {
  const { username } = req.body || {};
  const callerHwid = String(req.headers["x-app-hwid"] || "");
  // الكونكت حصري: لو اللايف شغال من جهاز آخر — ممنوع جهاز تاني يعمل كونكت
  // (سواء نفس اليوزر أو غيره) لحد ما الأول يفصل
  if (
    tiktokService.isConnected() &&
    connectOwner &&
    connectOwner.hwid !== callerHwid
  ) {
    return res.status(403).json({
      ok: false,
      success: false,
      connectedElsewhere: true,
      error:
        "اللايف متصل حالياً من جهاز آخر — افصل الجهاز التاني الأول أو اعمل disconnect من عنده",
    });
  }
  if (!username) {
    return res
      .status(400)
      .json({ success: false, error: "Username is required" });
  }

  try {
    eventRunner.setupTikTokListeners();
    const connectResult = await tiktokService.connect(username, {
      instantGifts: true,
    });
    eventRunner.resetStats();
    connectOwner = { hwid: callerHwid, email: licenseService.sessionEmail || "" };
    broadcastToWsClients("connection-status", { status: "connected" });
    licenseService?.setLive(true);
    store.set("connection.username", username);

    res.json({ success: true, roomInfo: connectResult });
  } catch (err) {
    const errorMessage = err?.message || String(err);
    console.error("[TikTok Connect Error]", errorMessage);
    res.json({
      success: false,
      error: errorMessage,
    });
  }
});

app.post("/api/tiktok/disconnect", (req, res) => {
  tiktokService.disconnect();
  licenseService?.setLive(false, eventRunner.globalStats.totalCoins || 0);
  connectOwner = null;
  broadcastToWsClients("connection-status", { status: "disconnected" });
  res.json({ success: true });
});

app.get("/api/tiktok/status", (req, res) => {
  res.json({
    connected: tiktokService.isConnected(),
    username: tiktokService.username,
  });
});

app.get("/api/tiktok/avatar/:user", async (req, res) => {
  const user = req.params.user;
  const result = await eventRunner.resolveAvatar(user);
  res.json(result);
});

app.get("/api/tiktok/gifts", (req, res) => {
  const cachedPath = path.join(store.dataDir, "gifts_cache.json");
  try {
    if (fs.existsSync(cachedPath)) {
      const parsed = JSON.parse(fs.readFileSync(cachedPath, "utf-8"));
      if (parsed && parsed.length > 0) {
        return res.json(parsed);
      }
    }
  } catch (e) {}
  res.json(defaultGifts);
});

app.get("/api/tiktok/gifts-live", async (req, res) => {
  try {
    const liveGifts = await tiktokService.getAvailableGifts();
    if (liveGifts && liveGifts.length > 0) {
      const cachedPath = path.join(store.dataDir, "gifts_cache.json");
      fs.writeFileSync(cachedPath, JSON.stringify(liveGifts, null, 2));
      broadcastToWsClients("gifts:updated", liveGifts);
      return res.json(liveGifts);
    }
  } catch (e) {}
  res.json(defaultGifts);
});

// ==========================================
// STORE & ACTIONS ROUTES
// ==========================================
app.get("/api/store/:key", (req, res) => {
  const key = req.params.key;
  if (key === "__all__") {
    // التصدير: كل بيانات الحساب (من غير مفاتيح النظام auth/license — دي في data العامة أصلاً)
    return res.json(store.get() ?? null);
  }
  if (key.startsWith("license.")) return res.json(null);
  res.json(store.get(key) ?? null);
});

// ═══ Backup مشفر — المفتاح يعيش في السيرفر فقط، الفرونت بيستلم blob مشفر جاهز ═══
const BK_MAGIC = Buffer.from("ELDBK1", "utf8");
let backupKeyCache = null;
function backupKey() {
  if (backupKeyCache) return backupKeyCache;
  // BACKUP_SECRET من البيئة اختياري — بدون منتصف سري ثابت مش مقروء من الكود
  const secret =
    process.env.BACKUP_SECRET ||
    "eldaly-bk/" + "7f3a91ce" + "::" + "vr1-static";
  backupKeyCache = crypto.createHash("sha256").update(secret).digest();
  return backupKeyCache;
}
function backupEncrypt(obj) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", backupKey(), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return Buffer.concat([BK_MAGIC, iv, c.getAuthTag(), enc]);
}
function backupDecrypt(buf) {
  if (!buf || buf.length < 34 || !buf.subarray(0, 6).equals(BK_MAGIC)) {
    throw new Error("bad magic");
  }
  const d = crypto.createDecipheriv("aes-256-gcm", backupKey(), buf.subarray(6, 18));
  d.setAuthTag(buf.subarray(18, 34));
  return JSON.parse(Buffer.concat([d.update(buf.subarray(34)), d.final()]).toString("utf8"));
}
const BK_CATEGORIES = [
  { id: "actions",    label: "Actions",         match: (k) => k === "actions" },
  { id: "events",     label: "Events",          match: (k) => k === "events" },
  { id: "hotkeys",    label: "Hotkeys",         match: (k) => (k === "hotkeys" || k.startsWith("hotkeys.")) && k !== "hotkeys.__migrated" },
  { id: "widgets",    label: "Widgets",         match: (k) => k.startsWith("widget_") && k !== "widget_tts" },
  { id: "tts",        label: "TTS Settings",    match: (k) => k === "widget_tts" },
  { id: "songs",      label: "Song Settings",   match: (k) => k === "songs.settings" },
  { id: "connection", label: "TikTok Username", match: (k) => k === "connection" },
];

// العدّ بالعناصر الحقيقية جوه البيانات — مش بعدد المفاتيح:
//   قايمة (أكشنز/إيفنتس/هوت كي) = عدد عناصرها (الفاضية = 0)
//   إعدادات (كائن) = 1 لو فيها قيم فعلية و 0 لو فاضي
//   علامات تقنية (true/false) و نصوص فاضية = 0
function bkItemCount(v) {
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") {
    // كائن إعدادات: 1 لو فيه قيمة فعلية — العلامات المنطقية والقوائم الفاضية ملهاش عداد
    let meaningful = false;
    for (const x of Object.values(v)) {
      if (typeof x === "boolean") continue;
      if (Array.isArray(x)) { if (x.length) { meaningful = true; break; } continue; }
      if (x && typeof x === "object") { if (bkItemCount(x) > 0) { meaningful = true; break; } continue; }
      if (x !== "" && x != null) { meaningful = true; break; }
    }
    return meaningful ? 1 : 0;
  }
  if (typeof v === "boolean") return 0;
  return (v === "" || v == null) ? 0 : 1;
}
function bkCatCount(cat, all) {
  // الهوت كي: بنعد قوايم الهوت كي الحقيقية جوه علبة hotkeys — العلامات مستبعدة
  if (cat.id === "hotkeys") {
    let n = 0;
    for (const k of Object.keys(all)) {
      if (k.startsWith("_") || !cat.match(k)) continue;
      const v = all[k];
      if (Array.isArray(v)) { n += v.length; continue; }
      if (v && typeof v === "object") {
        for (const x of Object.values(v)) {
          if (Array.isArray(x)) n += x.length;
        }
      }
    }
    return n;
  }
  let n = 0;
  for (const k of Object.keys(all)) {
    if (k.startsWith("_")) continue;
    if (!cat.match(k)) continue;
    n += bkItemCount(all[k]);
  }
  return n;
}

// التصدير: يستلم التصنيفات المختارة → يرمز البيانات → يرجع blob مشفر جاهز للتحميل
app.post("/api/backup/export", (req, res) => {
  const cats = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const all = store.get() || {};
  const data = {};
  let n = 0;
  for (const cat of BK_CATEGORIES) {
    if (!cats.includes(cat.id)) continue;
    for (const k of Object.keys(all)) {
      if (k.startsWith("_")) continue;
      if (cat.match(k)) { data[k] = all[k]; n += bkItemCount(all[k]); }
    }
  }
  if (!n) return res.status(400).json({ ok: false, error: "No data in the selected categories" });
  const blob = backupEncrypt({
    app: "eldaly-stream",
    kind: "backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  });
  res.json({ ok: true, items: n, blob: blob.toString("base64") });
});

// عدادات التصنيفات لنافذة التصدير — أرقام حقيقية من بيانات الحساب
app.post("/api/backup/counts", (req, res) => {
  const cats = Array.isArray(req.body?.categories) ? req.body.categories : [];
  const all = store.get() || {};
  const counts = {};
  for (const cat of BK_CATEGORIES) {
    if (!cats.includes(cat.id)) continue;
    counts[cat.id] = bkCatCount(cat, all);
  }
  res.json({ ok: true, counts });
});

// الاستيراد: بدون apply = معاينة التصنيفات اللي جوه الملف فقط (بدون تطبيق)
// مع apply = يطبق التصنيفات المختارة على الحساب
app.post("/api/backup/import", (req, res) => {
  const blob = String(req.body?.blob || "");
  let parsed;
  try {
    parsed = backupDecrypt(Buffer.from(blob, "base64"));
  } catch (e) {
    return res.status(400).json({ ok: false, error: "Invalid or corrupted backup file" });
  }
  const data = parsed.data || {};
  const apply = Array.isArray(req.body?.apply) ? req.body.apply : null;
  const categories = BK_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: bkCatCount(c, data),
  })).filter((x) => x.count > 0);
  if (!apply) return res.json({ ok: true, categories });
  let imported = 0, failed = 0;
  for (const cat of BK_CATEGORIES) {
    if (!apply.includes(cat.id)) continue;
    for (const k of Object.keys(data)) {
      if (k.startsWith("_") || !cat.match(k)) continue;
      try {
        store.set(k, data[k] === undefined ? null : data[k]);
        imported++;
      } catch (e) { failed++; }
    }
  }
  res.json({ ok: true, imported, failed });
});

app.post("/api/store/:key", (req, res) => {
  const key = req.params.key;
  if (key.startsWith("license.")) return res.json({ ok: false });
  store.set(key, req.body.value !== undefined ? req.body.value : req.body);
  res.json({ ok: true });
});

app.delete("/api/store/:key", (req, res) => {
  const key = req.params.key;
  store.delete(key);
  res.json({ ok: true });
});

app.get("/api/actions", (req, res) => {
  res.json(store.get("actions") || []);
});

app.post("/api/actions", (req, res) => {
  const actions = req.body.actions || req.body;
  const limits = getTierLimits();
  if (Array.isArray(actions) && actions.length > limits.actions) {
    return res.json({
      ok: false,
      reason: "limit",
      limit: limits.actions,
      tier: limits.tier,
    });
  }
  store.set("actions", actions);
  res.json({ ok: true });
});

app.post("/api/actions/execute", (req, res) => {
  const { actionId, context } = req.body || {};
  const actions = store.get("actions") || [];
  const action = actions.find((a) => a.id === actionId);
  if (action) {
    eventRunner.executeAction(action, context || {});
    eventRunner.log(`[Execute] ${action.name}`);
  }
  res.json({ ok: true });
});

app.post("/api/actions/execute-delayed", (req, res) => {
  const { actionId, delaySeconds, context } = req.body || {};
  const actions = store.get("actions") || [];
  const action = actions.find((a) => a.id === actionId);
  if (action) {
    // سقف للتأخير — يمنع تكديس مؤقتات لانهائية
    const s = Math.min(Math.max(parseInt(delaySeconds, 10) || 5, 0), 600);
    eventRunner.log(`[Delayed] ${action.name} in ${s}s...`);
    setTimeout(() => {
      eventRunner.executeAction(action, context || {});
      eventRunner.log(`[Execute] ${action.name} (delayed)`);
    }, s * 1000);
  }
  res.json({ ok: true });
});

app.post("/api/actions/duplicate", (req, res) => {
  const { actionId } = req.body || {};
  const actions = store.get("actions") || [];
  const item = actions.find((a) => a.id === actionId);
  if (!item) return res.status(404).json({ error: "Action not found" });

  const clone = JSON.parse(JSON.stringify(item));
  clone.id =
    "act_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  clone.name = item.name + " (Copy)";
  actions.push(clone);
  store.set("actions", actions);
  res.json({ ok: true, actions });
});

// ==========================================
// EVENTS ROUTES
// ==========================================
app.get("/api/events", (req, res) => {
  res.json(store.get("events") || []);
});

app.post("/api/events", (req, res) => {
  const events = req.body.events || req.body;
  store.set("events", events);
  res.json({ ok: true });
});

app.post("/api/events/test", (req, res) => {
  const { eventId } = req.body || {};
  eventRunner.executeEventById(eventId);
  res.json({ ok: true });
});

app.post("/api/events/test-delayed", (req, res) => {
  const { eventId, delaySeconds } = req.body || {};
  const s = Math.min(Math.max(parseInt(delaySeconds, 10) || 5, 0), 600);
  eventRunner.log(`[Test Event] Will execute in ${s}s...`);
  setTimeout(() => {
    eventRunner.executeEventById(eventId);
  }, s * 1000);
  res.json({ ok: true });
});

// ==========================================
// PROFILES ROUTES
// ==========================================
function ensureProfilesInit() {
  let profiles = store.get("profiles");
  if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
    const defaultId = "prof_default";
    store.set("profiles", [{ id: defaultId, name: "Default" }]);
    store.set("activeProfileId", defaultId);
    store.set("profileData." + defaultId, {
      actions: store.get("actions") || [],
      events: store.get("events") || [],
      connection: store.get("connection") || {},
    });
  }
  if (!store.get("activeProfileId")) {
    store.set("activeProfileId", store.get("profiles")[0].id);
  }
}

function saveActiveProfileData() {
  const activeId = store.get("activeProfileId");
  if (!activeId) return;
  store.set("profileData." + activeId, {
    actions: store.get("actions") || [],
    events: store.get("events") || [],
    connection: store.get("connection") || {},
  });
}

function loadProfileData(profileId) {
  const data = store.get("profileData." + profileId) || {};
  store.set("actions", data.actions || []);
  store.set("events", data.events || []);
  store.set("connection", data.connection || {});
}

app.get("/api/profiles", (req, res) => {
  ensureProfilesInit();
  res.json({
    profiles: store.get("profiles") || [],
    activeId: store.get("activeProfileId"),
  });
});

app.post("/api/profiles/create", (req, res) => {
  const { name } = req.body || {};
  const limits = getTierLimits();
  const profiles = store.get("profiles") || [];
  if (profiles.length >= limits.profiles) {
    return res.json({
      ok: false,
      reason: "limit",
      limit: limits.profiles,
      tier: limits.tier,
    });
  }

  const newId =
    "prof_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  profiles.push({ id: newId, name: name || "New Profile" });
  store.set("profiles", profiles);
  store.set("profileData." + newId, {
    actions: [],
    events: [],
    connection: {},
  });

  res.json({ ok: true, profiles, newId });
});

app.post("/api/profiles/rename", (req, res) => {
  const { id, name } = req.body || {};
  const profiles = store.get("profiles") || [];
  const found = profiles.find((p) => p.id === id);
  if (found) {
    found.name = name;
    store.set("profiles", profiles);
  }
  res.json({ ok: true, profiles });
});

app.delete("/api/profiles/:id", (req, res) => {
  const id = req.params.id;
  let profiles = store.get("profiles") || [];
  if (profiles.length <= 1) {
    return res.json({ error: "Cannot delete the last profile" });
  }

  profiles = profiles.filter((p) => p.id !== id);
  store.set("profiles", profiles);
  store.delete("profileData." + id);

  if (store.get("activeProfileId") === id) {
    const firstId = profiles[0].id;
    store.set("activeProfileId", firstId);
    loadProfileData(firstId);
  }

  res.json({ profiles, activeId: store.get("activeProfileId") });
});

app.post("/api/profiles/switch", (req, res) => {
  const { id } = req.body || {};
  saveActiveProfileData();
  store.set("activeProfileId", id);
  loadProfileData(id);

  res.json({
    actions: store.get("actions") || [],
    events: store.get("events") || [],
    connection: store.get("connection") || {},
  });
});

app.post("/api/profiles/duplicate", (req, res) => {
  const { id, name } = req.body || {};
  const limits = getTierLimits();
  const profiles = store.get("profiles") || [];
  if (profiles.length >= limits.profiles) {
    return res.json({
      ok: false,
      reason: "limit",
      limit: limits.profiles,
      tier: limits.tier,
    });
  }

  const originalData = store.get("profileData." + id) || {
    actions: [],
    events: [],
    connection: {},
  };
  const newId =
    "prof_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
  profiles.push({ id: newId, name: name || "Copy" });
  store.set("profiles", profiles);
  store.set("profileData." + newId, JSON.parse(JSON.stringify(originalData)));

  res.json({ ok: true, profiles, newId });
});

app.post("/api/profiles/reset-actions", (req, res) => {
  store.set("actions", []);
  res.json({ ok: true });
});

app.post("/api/profiles/reset-events", (req, res) => {
  store.set("events", []);
  res.json({ ok: true });
});

app.post("/api/profiles/reset-all", (req, res) => {
  store.set("actions", []);
  store.set("events", []);
  store.set("connection", {});
  res.json({ ok: true });
});

// ==========================================
// ==========================================
// SONGS (SoundCloud requests) — محمية بجلسة التطبيق أو توكن الأوفرلاي
// ==========================================
// الصفحتين دول مصممين يتحطوا جوه iframe في البرنامج و OBS — من غير X-Frame-Options

// نظام الأغاني — ميزة حصرية لباقة Pro/VIP:
// كل مسارات /api/songs/* بتعد على الفحص ده — المجاني بياخد 403 مع proRequired
// (الواجهة بتعرض رسالة ترقية)، وحساب المالك له وصول دائم بأي تير
const OWNER_EMAILS = ["kemo.eldaly44@gmail.com", "captenblank1@gmail.com"];
function songTierCheck(req, res) {
  const email = String(licenseService.sessionEmail || "").toLowerCase();
  if (OWNER_EMAILS.includes(email)) return true;
  const tier = licenseService.currentTier;
  if (tier === "pro" || tier === "vip") return true;
  res.status(403).json({
    ok: false,
    proRequired: true,
    tier: tier || "free",
    reason: "طلب الأغاني متاح لمشتركي الباقة المدفوعة (Pro) فقط",
  });
  return false;
}

app.get("/api/songs/state", (req, res) => {
  if (!songTierCheck(req, res)) return;
  res.json({ ok: true, ...songreq.queueState(), history: songreq.getHistory(), settings: songSettings() });
});
app.post("/api/songs/settings", (req, res) => {
  if (!songTierCheck(req, res)) return;
  const merged = saveSongSettings(req.body || {});
  songreq.broadcastQueue(); // الويدجت ياخد الطابور والإعدادات الجديدة لحظيًا
  broadcastSongs({ topic: "sr-settings", settings: merged }); // الصوت والمقاس يتحدثوا لحظياً (WS + SSE)
  res.json({ ok: true, settings: merged });
});
app.post("/api/songs/control", (req, res) => {
  if (!songTierCheck(req, res)) return;
  res.json(songreq.control((req.body || {}).action));
});
app.post("/api/songs/skip", (req, res) => {
  if (!songTierCheck(req, res)) return;
  res.json(songreq.skip("Dashboard", true));
});
app.post("/api/songs/remove", (req, res) => {
  if (!songTierCheck(req, res)) return;
  res.json(songreq.removeById(String((req.body || {}).id || "")));
});
app.post("/api/songs/clear", (req, res) => {
  if (!songTierCheck(req, res)) return;
  res.json(songreq.clearQueue());
});
app.post("/api/songs/test", async (req, res) => {
  if (!songTierCheck(req, res)) return;
  try {
    const q = String((req.body || {}).query || '').trim();
    if (!q) return res.status(400).json({ ok: false, error: "اكتب اسم الأغنية" });
    const track = await songreq.addTrack("Dashboard", q);
    res.json({ ok: true, track });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});
app.get("/api/songs/search", async (req, res) => {
  if (!songTierCheck(req, res)) return;
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ ok: true, results: [] });
    res.json({ ok: true, results: await songreq.search(q) });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});
// WIDGETS & OVERLAYS ROUTES
// ==========================================
// لينكات صفحات الأغاني بتتقدم من OverlayHttpService فوق (‎/widget/:token/:name)
// بنفس فحص التوكن — مفيش مسارات مكررة هنا

function isPremiumWidget(widgetId) {
  return PREMIUM_WIDGETS.some((item) =>
    String(widgetId || "").startsWith(item),
  );
}

app.get("/api/widgets/:id/config", (req, res) => {
  const widgetId = req.params.id;
  res.json(store.get("widget_" + widgetId) || null);
});

app.post("/api/widgets/:id/config", (req, res) => {
  const widgetId = req.params.id;
  const config = req.body.config || req.body;
  const limits = getTierLimits();

  if (limits.premiumWidgets === false && isPremiumWidget(widgetId)) {
    return res.json({ ok: false, reason: "upgrade", tier: limits.tier });
  }

  store.set("widget_" + widgetId, config);
  overlayServer.setWidgetConfig(widgetId, config);
  res.json({ ok: true });
});

app.post("/api/widgets/:id/test", (req, res) => {
  const widgetId = req.params.id;
  overlayServer.testWidget(widgetId, req.body || {});
  res.json({ ok: true });
});

app.get("/api/overlay/urls", (req, res) => {
  // روابط الأوفرلاي بتتولد في الفرونت إند نفسه بالتوكن السداسي بتاع الحساب
  res.json([]);
});

app.get("/api/overlay/screens", (req, res) => {
  const out = {};
  for (let i = 1; i <= 10; i++) {
    out[String(i)] =
      store.get("screenSettings_" + i) || { queueEnabled: false, queueMax: 5 };
  }
  res.json(out);
});

app.get("/api/overlay/screens/:id", (req, res) => {
  res.json(
    store.get("screenSettings_" + req.params.id) || {
      queueEnabled: false,
      queueMax: 5,
    },
  );
});

app.post("/api/overlay/screens/:id", (req, res) => {
  const current =
    store.get("screenSettings_" + req.params.id) || {
      queueEnabled: false,
      queueMax: 5,
    };
  store.set("screenSettings_" + req.params.id, { ...current, ...req.body });
  res.json({ ok: true });
});

app.get("/api/overlay/queue-status", (req, res) => {
  // الطابور بيتإدارة محليًا في تطبيق الديسكتوب
  res.json({});
});

app.post("/api/overlay/test-tts", async (req, res) => {
  const { text, options } = req.body || {};
  try {
    const { EdgeTTS } = require("node-edge-tts");
    const edge = new EdgeTTS(options || {});
    const tempPath = path.join(
      eventRunner.ttsTempDir,
      `temp_test_tts_${Date.now()}.mp3`,
    );
    try {
      await edge.ttsPromise(text, tempPath);
      const audioBase64 = fs.readFileSync(tempPath, "base64");
      const ttsData = { audioBase64, config: options };
      broadcastToWsClients("play-local-tts", ttsData);
      overlayServer.queueTTS("1", { ...ttsData, maxQueue: 3 });
      eventRunner.log("[TTS] ✔ Test voice generated");
      res.json({ success: true });
    } finally {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (e) {}
    }
  } catch (err) {
    try {
      const googleUrl = googleTtsApi.getAudioUrl(text, {
        lang: "ar",
        slow: false,
        host: "https://translate.google.com",
      });
      broadcastToWsClients("play-local-tts", {
        url: googleUrl,
        config: options,
      });
      overlayServer.queueTTS("1", { text, lang: "ar", maxQueue: 3 });
      eventRunner.log("[TTS] ⚠ Edge voice failed — Google fallback used");
      res.json({ success: true });
    } catch (e2) {
      eventRunner.log("[TTS] ✘ Test failed: " + e2.message);
      res.json({ success: false, error: e2.message });
    }
  }
});

// ==========================================
// EXTENSIONS ROUTES
// ==========================================
app.post("/api/ext/command", (req, res) => {
  const { command, arg1, arg2 } = req.body || {};
  if (command === "gift-spinner" && arg1 === "test") {
    const spinnerId = arg2?.spinnerId;
    const cfg = store.get("widget_gift-spinners");
    if (cfg && cfg.spinners) {
      if (spinnerId) {
        const found = cfg.spinners.find((s) => s.id === spinnerId);
        if (found) eventRunner.spinSpinner(found, found.id, "TestUser");
      } else {
        for (const s of cfg.spinners)
          eventRunner.spinSpinner(s, s.id, "TestUser");
      }
    }
    return res.json({ ok: true });
  }

  overlayServer.broadcastExtension("ext-" + command, { action: arg1, ...arg2 });
  res.json({ ok: true });
});

app.get("/api/ext/scoreboard", (req, res) => {
  res.json(eventRunner.scoreboardState);
});

app.post("/api/ext/scoreboard/update", (req, res) => {
  const { side, amount } = req.body || {};
  const state = eventRunner.updateScoreboard(side, amount);
  res.json(state);
});

app.post("/api/ext/scoreboard/set", (req, res) => {
  const { left, right } = req.body || {};
  const state = eventRunner.setScoreboard(left, right);
  res.json(state);
});

app.post("/api/ext/scoreboard/reset", (req, res) => {
  const state = eventRunner.resetScoreboard();
  res.json(state);
});

app.get("/api/ext/timer", (req, res) => {
  res.json(eventRunner.getTimerState());
});

app.post("/api/ext/timer/start", (req, res) => {
  const { minutes } = req.body || {};
  eventRunner.startTimer(minutes);
  res.json({ ok: true, state: eventRunner.getTimerState() });
});

app.post("/api/ext/timer/stop", (req, res) => {
  eventRunner.stopTimer();
  res.json({ ok: true, state: eventRunner.getTimerState() });
});

app.post("/api/ext/timer/reset", (req, res) => {
  const { minutes } = req.body || {};
  eventRunner.resetTimer(minutes);
  res.json({ ok: true, state: eventRunner.getTimerState() });
});

app.post("/api/ext/timer/add-time", (req, res) => {
  const { seconds } = req.body || {};
  eventRunner.addTimerTime(seconds);
  res.json({ ok: true, state: eventRunner.getTimerState() });
});

app.post("/api/ext/timer/remove-time", (req, res) => {
  const { seconds } = req.body || {};
  eventRunner.removeTimerTime(seconds);
  res.json({ ok: true, state: eventRunner.getTimerState() });
});

// ==========================================
// SYSTEM HELPERS
// ==========================================
app.get("/api/system/sounds", async (req, res) => {
  const query = String(req.query.query || "").trim();
  const page = parseInt(req.query.page, 10) || 1;
  const UA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

  // myinstants شالوا الـ API الرسمي (/api/v1/instants → 404 HTML) —
  // فبنسحب صفحة البحث HTML (لسه شغالة) ونطلّع الأصوات منها:
  // <button class="small-button" onclick="play('/media/sounds/x.mp3', 'loader-1', 'name')" title="Play NAME sound">
  try {
    const url =
      "https://www.myinstants.com/en/search/?name=" +
      encodeURIComponent(query || "") +
      (page > 1 ? "&page=" + page : "");
    let html = "";
    const cookieJar = path.join(require("os").tmpdir(), "eldaly-myinstants-" + process.pid + "-" + Date.now() + ".cookies");
    try {
      const curl = await execFileAsync("curl", [
        "-sS", "-L", "--max-time", "20", "-A", UA,
        "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "-H", "Accept-Language: en-US,en;q=0.9", "-c", cookieJar,
        "-o", process.platform === "win32" ? "NUL" : "/dev/null",
        "https://www.myinstants.com/en/", "--next", "-sS", "-L", "--max-time", "20",
        "-A", UA, "-H", "Referer: https://www.myinstants.com/", "-b", cookieJar, url,
      ], { maxBuffer: 10 * 1024 * 1024 });
      html = curl.stdout || "";
    } catch (e) {
      try {
        const response = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", Referer: "https://www.myinstants.com/" }, signal: AbortSignal.timeout(10000) });
        if (response.ok) html = await response.text();
      } catch (fallbackError) {}
    } finally {
      try { fs.unlinkSync(cookieJar); } catch (e) {}
    }
    if (!html) return res.json({ error: "اتصال مكتبة الأصوات فشل — جرّب تاني" });
    const results = [];
    const seen = new Set();
    const re = /onclick\s*=\s*"play\(\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'([^']*)'\s*\)"[\s\S]*?title\s*=\s*"Play\s+([^"]+)"/gi;
    let m;
    while ((m = re.exec(html)) && results.length < 50) {
      const sound = m[1].startsWith("http") ? m[1] : "https://www.myinstants.com" + m[1];
      if (seen.has(sound)) continue;
      seen.add(sound);
      const name = (m[3] || m[2] || "sound").replace(/\s+sound$/i, "");
      results.push({ name, sound });
    }
    // ترقيم الصفحات: كل صفحة بحث فيها ~10 أصوات — لو أقل من كده يبقى مفيش صفحة جاية
    return res.json({ results, next: results.length >= 10 ? page + 1 : null });
  } catch (err) {
    return res.json({ error: "اتصال مكتبة الأصوات فشل — جرّب تاني" });
  }
});

// ==========================================
// START SERVERS
// ==========================================
function startLicenseWatchdog() {
  setInterval(async () => {
    if (!licenseService.hasSession()) return;
    try {
      const restoreResult = await licenseService.restoreSession();
      if (!restoreResult.loggedIn) {
        licenseService.currentTier = null;
        if (tiktokService.isConnected()) tiktokService.disconnect();
      }
    } catch (e) {}
  }, 150000);
}

// حفظ أي تغييرات معلّقة في قاعدة البيانات قبل الإقفال
async function flushAndExit(signal) {
  try {
    await Promise.race([
      store.flushCloud(),
      new Promise((r) => setTimeout(r, 4000)),
    ]);
  } catch (e) {}
  process.exit(0);
}
process.on("SIGINT", () => flushAndExit("SIGINT"));
process.on("SIGTERM", () => flushAndExit("SIGTERM"));

// مسارات خارجية للتوافق: webhook لتشغيل الأحداث + أزرار سكوربورد خارجية
// دي نقط محمية بمفتاح سري في البيئة (PUBLIC_API_KEY) — من غيره بتترفض.
// من غير المفتاح كان أي حد على النت يقدر يعبث بالسكوربورد أو يشغّل الويبهوك.
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY || "";
function publicKeyGuard(req, res) {
  if (!PUBLIC_API_KEY) {
    res.status(403).json({ ok: false, reason: "external access disabled" });
    return false;
  }
  const key = String(req.query.key || "");
  if (!safeEqual(key, PUBLIC_API_KEY)) {
    res.status(403).json({ ok: false, reason: "invalid key" });
    return false;
  }
  return true;
}

app.all("/api/webhook/:id", externalActionRateLimiter, (req, res) => {
  if (!publicKeyGuard(req, res)) return;
  if (overlayServer._onWebhook) overlayServer._onWebhook(req.params.id);
  res.json({ ok: true, message: "Webhook triggered successfully" });
});

app.all("/api/scoreboard/:cmd", externalActionRateLimiter, (req, res) => {
  if (!publicKeyGuard(req, res)) return;
  const cmd = req.params.cmd;
  const url = new URL(req.url, "http://" + (req.headers.host || "127.0.0.1"));
  const value = parseInt(url.searchParams.get("value")) || 1;
  let state;
  if (cmd === "left/up") state = eventRunner.updateScoreboard("left", value);
  else if (cmd === "left/down")
    state = eventRunner.updateScoreboard("left", -value);
  else if (cmd === "right/up") state = eventRunner.updateScoreboard("right", value);
  else if (cmd === "right/down")
    state = eventRunner.updateScoreboard("right", -value);
  else if (cmd === "reset") state = eventRunner.resetScoreboard();
  else if (cmd === "set") {
    state = eventRunner.setScoreboard(
      url.searchParams.get("left"),
      url.searchParams.get("right"),
    );
  } else {
    return res.status(404).json({ error: "Unknown route" });
  }
  res.json({ success: true, left: state.left, right: state.right });
});

app.get("/api/scoreboard", (req, res) => {
  res.json(eventRunner.scoreboardState || { left: 0, right: 0 });
});

// REST & WebSocket على نفس البورت — الافتراضي localhost فقط
// معالج أخطاء عام — يمنع تسريب تفاصيل الأخطاء ويرجّع JSON بدل HTML
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ ok: false, reason: "invalid json" });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({ ok: false, reason: "payload too large" });
  }
  console.error("[API Error]", err && err.message);
  res.status(500).json({ ok: false, reason: "internal error" });
});

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 ELDALY STREAM Backend API running on ${HOST}:${PORT}`);
  console.log(
    `📺 Overlays are served by the desktop app (local, token-protected)`,
  );
  console.log(`⚡ WebSocket Stream available at ws://${HOST}:${PORT}/ws`);
  console.log(`=======================================================`);
  loadLimitsFromDb(); // حدود التيرات من الداتابيز
  if (!PUBLIC_API_KEY) {
    console.log(
      `🔒 PUBLIC_API_KEY مش متحدد في البيئة — /api/webhook و /api/scoreboard الخارجية مقفولة تمامًا.\n` +
        `   لو محتاج أزرار خارجية: ضيف PUBLIC_API_KEY في .env واستخدم ?key=... في الرابط.`,
    );
  }
  startLicenseWatchdog();
});
