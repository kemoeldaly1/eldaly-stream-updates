// ==========================================================================
// Accounts — نظام متعدد الجلسات: سياق كامل لكل حساب عميل.
// كل حساب ليه حالته المنفصلة بالكامل:
//   Store (بياناته) / License (جلسته) / TikTok (اتصال بثه) /
//   EventRunner (أحداثه وأكشنزه) / OverlayServer (ويدجته) /
//   Songs (طابور أغانيه) / WS clients (عملاؤه المتصلين)
// الحسابات مستقلة تمامًا — أكتر من عميل بإيميلات مختلفة يشتغلوا في نفس
// اللحظة من غير ما يلمسوا بعض. كل حساب بيفضل ماسك جهاز واحد نشط (نفس
// قواعد الحماية القديمة بتاعة "آخر جهاز نشيط هو المسيطر").
// ==========================================================================

const crypto = require("crypto");
const { WebSocket } = require("ws");
const StoreService = require("./store");
const LicenseService = require("./license");
const TikTokService = require("./tiktok");
const OverlayServer = require("./overlay-server");
const EventRunner = require("./event-runner");
const { createSongSystem } = require("./soundcloud");

const ACTIVE_WINDOW_MS = 90 * 1000; // الجلسة النشطة = بعتت طلب في آخر 90 ثانية
const KICK_WINDOW_MS = 10 * 60 * 1000; // الجهاز المطرود بيترفض لمدة 10 دقايق
const IDLE_CLOSE_MS = 15 * 60 * 1000; // حساب من غير نشاط بيتقفل لتوفير الذاكرة
const SESSION_STALE_MS = 24 * 60 * 60 * 1000; // جلسة مهجورة من أمس بتتمسح

// مواضيع الأغاني المسموح ترسل لضيوف الويدجت (بتوكن أوفرلاي مطابق)
const GUEST_SONG_TOPICS = new Set([
  "songqueue",
  "songstate",
  "songhistory",
  "sr-settings",
  "sr-control",
]);

function safeEqual(a, b) {
  const ba = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (ba.length !== bb.length || ba.length === 0) return false;
  return crypto.timingSafeEqual(ba, bb);
}

class AccountContext {
  constructor(email, hooks) {
    this.email = String(email || "").trim().toLowerCase();
    this.hooks = hooks || {};
    this.store = new StoreService();
    this.license = new LicenseService(this.store);
    this.tiktok = null;
    this.overlayServer = null;
    this.eventRunner = null;
    this.songs = createSongSystem(this.email);
    this.overlayToken = null;
    this.session = null; // { token, hwid, lastSeen } — جهاز واحد نشط لكل حساب
    this.kicked = null; // { token, at } — الجهاز المطرود بيعرف إنه اتطرد
    this.wsClients = new Set(); // عملاء WS بتوع الحساب (تطبيق + ضيوف ويدجت الأغاني)
    this.userCache = { at: 0, data: null }; // حالة الحساب الرسمية (حظر/تير)
    this._userRefreshing = false;
    this._lastTrackEndedAt = 0;
    this.lastSeen = 0;
    this.closed = false;

    // بث الأغاني: WS بتاع الحساب + SSE بتوكن الأوفرلاي بتاعه
    this.songs.init(
      (obj) => {
        this.broadcastRaw(obj);
        try { this.hooks.onSongEvent && this.hooks.onSongEvent(this, obj); } catch (e) {}
      },
      () => (this.hooks.getSongSettings ? this.hooks.getSongSettings(this) : { songrequests: {} }),
    );
  }

  // ربط كامل بعد نجاح دخول — خدمات البث بتتنشأ أول مرة بس
  async activate(idToken) {
    await this.store.setAccount(this.email, idToken);
    this.store.getToken = () => this.license.getIdToken();
    if (!this.eventRunner && !this.closed) {
      this.tiktok = new TikTokService();
      this.overlayServer = new OverlayServer(this.store);
      this.eventRunner = new EventRunner(
        this.store,
        this.overlayServer,
        this.tiktok,
        this.license,
      );
      this._wireRunner();
    }
  }

  _wireRunner() {
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
      this.eventRunner.on(ev, (data) => this.broadcastEvent(ev, data));
    }
    // التيك توك قافل البث من عنده: سجّل إحصائيات الجلسة
    this.eventRunner.on("tiktok:streamEnd", () => {
      this.license?.setLive(false, this.eventRunner.globalStats.totalCoins || 0);
    });
    // كل أحداث الأوفرلاي/الويدجت: WS للحساب + SSE لصفحات OBS بتوكنه
    this.overlayServer.setForward((type, payload) => {
      this.broadcastEvent(type, payload);
      try { this.hooks.onOverlayEvent && this.hooks.onOverlayEvent(this, type, payload); } catch (e) {}
    });
    // أوامر طلبات الأغاني من شات التيك توك بتاع الحساب ده
    this.tiktok.on("chat", (c) => {
      try { this.hooks.onChat && this.hooks.onChat(this, c); } catch (e) {}
    });
  }

  // ====== جلسة الجهاز (جهاز واحد نشط لكل حساب) ======
  mintSession(hwid) {
    const now = Date.now();
    const device = String(hwid || "");
    if (this.session && this.session.hwid === device) {
      this.session.lastSeen = now;
      return this.session.token;
    }
    if (this.session && this.session.hwid !== device) {
      // الجهاز الشغال الأول هو المسيطر — الجهاز التاني بيترفض
      if (now - this.session.lastSeen < ACTIVE_WINDOW_MS) return null;
      this._takeover();
    }
    this.session = {
      token: crypto.randomBytes(24).toString("hex"),
      hwid: device,
      lastSeen: now,
    };
    return this.session.token;
  }

  // استيلاء نظيف على جلسة ميتة: اقفل WS القديم واقطع بثه عشان ميختلطش
  _takeover() {
    const old = this.session ? this.session.token : null;
    this.kicked = old ? { token: old, at: Date.now() } : null;
    if (old) {
      for (const client of this.wsClients) {
        if (client._appSession === old) {
          try { client.close(4401, "opened elsewhere"); } catch (e) {}
          this.wsClients.delete(client);
        }
      }
    }
    if (this.tiktok && this.tiktok.isConnected()) {
      try { this.tiktok.disconnect(); } catch (e) {}
      this.broadcastEvent("connection-status", { status: "disconnected" });
    }
  }

  isKicked(token) {
    return !!(
      token &&
      this.kicked &&
      this.kicked.token === token &&
      Date.now() - this.kicked.at < KICK_WINDOW_MS
    );
  }

  // البرنامج بيقفل بشكل نظيف — بيسيب الجهاز فاضي عشان يفتح من أي مكان
  releaseSession() {
    const old = this.session ? this.session.token : null;
    if (old) {
      for (const client of this.wsClients) {
        if (client._appSession === old) {
          try { client.close(1000, "bye"); } catch (e) {}
          this.wsClients.delete(client);
        }
      }
    }
    this.session = null;
    this.kicked = null;
  }

  sessionOk(token, hwid) {
    if (!this.session || !token) return false;
    if (!safeEqual(token, this.session.token)) return false;
    if (this.session.hwid && !safeEqual(hwid, this.session.hwid)) return false;
    this.session.lastSeen = Date.now();
    return true;
  }

  // ====== بث لعملاء الحساب ======
  broadcastRaw(obj) {
    const m = JSON.stringify(obj);
    for (const client of this.wsClients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      if (client._guest) {
        if (
          GUEST_SONG_TOPICS.has(obj.topic) &&
          client._overlayToken &&
          this.overlayToken &&
          safeEqual(client._overlayToken, this.overlayToken)
        ) {
          try { client.send(m); } catch (e) {}
        }
        continue;
      }
      try { client.send(m); } catch (e) {}
    }
  }

  broadcastEvent(type, data) {
    const msg = JSON.stringify({ type, data, timestamp: Date.now() });
    for (const client of this.wsClients) {
      if (client._guest) continue; // أحداث التطبيق للجلسة بس — مش للضيوف
      if (client.readyState === WebSocket.OPEN) {
        try { client.send(msg); } catch (e) {}
      }
    }
  }

  // إشارة "الأغنية خلصت" من صفحات الأوفرلاي — حماية تكرار لكل حساب
  songEndedSignal() {
    const now = Date.now();
    if (now - this._lastTrackEndedAt > 5000) {
      this._lastTrackEndedAt = now;
      this.songs.trackEnded();
    }
  }

  // ====== حالة الحساب الرسمية (حظر/تير) بتتجلب كل دقيقة =====
  async refreshUserDoc() {
    if (this._userRefreshing || !this.license.sessionEmail) return;
    this._userRefreshing = true;
    try {
      const data = await this.license.refreshSessionUser();
      if (data && data.user) this.userCache = { at: Date.now(), data };
    } catch (e) {} finally {
      this._userRefreshing = false;
    }
  }

  // فرض الحالة الرسمية على الجلسة — حظر = قفل فوري
  enforceUser(res) {
    const data = this.userCache.data;
    if (!data) return true;
    const kill = (reason) => {
      try { if (this.tiktok) this.tiktok.disconnect(); } catch (e) {}
      this.releaseSession();
      this.broadcastEvent("connection-status", { status: "disconnected" });
      res.status(403).json({ ok: false, kicked: true, reason });
      return false;
    };
    if (data.hwidBanned) return kill("الجهاز محظور من الإدارة");
    const u = data.user;
    if (u && (u.banned || u.deleted)) return kill("الحساب محظور من الإدارة");
    return true;
  }

  touch() {
    this.lastSeen = Date.now();
    if (this.session) this.session.lastSeen = this.lastSeen;
  }

  // ====== الإقفال النظيف =====
  close() {
    if (this.closed) return;
    this.closed = true;
    try { if (this.tiktok) this.tiktok.disconnect(); } catch (e) {}
    for (const client of this.wsClients) {
      try { client.close(1001, "account closed"); } catch (e) {}
    }
    this.wsClients.clear();
    try { this.songs.dispose(); } catch (e) {}
    try { this.store.clearAccount(); } catch (e) {}
    try { this.hooks.onAccountClosed && this.hooks.onAccountClosed(this); } catch (e) {}
  }
}

class AccountRegistry {
  constructor(hooks) {
    this.hooks = hooks;
    this.byEmail = new Map();
    this.bySession = new Map(); // sessionToken -> ctx
    this.byOverlay = new Map(); // overlayToken -> ctx
    this._sweepTimer = setInterval(() => this.sweep(), 60000);
    this._sweepTimer.unref();
  }

  get(email) {
    return this.byEmail.get(String(email || "").trim().toLowerCase()) || null;
  }

  getOrCreate(email) {
    const clean = String(email || "").trim().toLowerCase();
    let ctx = this.byEmail.get(clean);
    if (!ctx) {
      ctx = new AccountContext(clean, this.hooks);
      this.byEmail.set(clean, ctx);
    }
    return ctx;
  }

  setOverlayToken(ctx, token) {
    if (ctx.overlayToken && ctx.overlayToken !== token) {
      this.byOverlay.delete(ctx.overlayToken);
    }
    ctx.overlayToken = token || null;
    if (token) this.byOverlay.set(token, ctx);
  }

  // فهرسة توكن الجلسة الحالي — التوكنات القديمة (المطرودة) بتفضل موجودة
  // عشان الجهاز القديم ياخد رد "kicked" واضح بدل 401 صامت
  indexSession(ctx) {
    if (ctx.session) this.bySession.set(ctx.session.token, ctx);
  }

  unindexSession(ctx) {
    if (!ctx.session) return;
    this.bySession.delete(ctx.session.token);
  }

  // بيعيد السياق المرتبط بالتوكن — صلاحية الجلسة نفسها بيتحققها المنادي
  // (sessionOk)؛ التوكن المطرود بيوصّل للسياق عشان يترفض بإيجابية
  getBySession(token) {
    return this.bySession.get(String(token || "")) || null;
  }

  getByOverlay(token) {
    return this.byOverlay.get(String(token || "")) || null;
  }

  // أحدث حساب نشط — fallback لمسارات الويبهوك الخارجية (المفتاح سري بتاع المالك)
  mostRecentActive() {
    let best = null;
    for (const ctx of this.byEmail.values()) {
      if (!ctx.lastSeen) continue;
      if (!best || ctx.lastSeen > best.lastSeen) best = ctx;
    }
    return best;
  }

  remove(ctx) {
    ctx.close();
    this.unindexSession(ctx);
    if (ctx.overlayToken) this.byOverlay.delete(ctx.overlayToken);
    this.byEmail.delete(ctx.email);
  }

  all() {
    return [...this.byEmail.values()];
  }

  // تنظيف دوري: جلسات مهجورة وحسابات خاملة وتوكنات مطرودة قديمة
  sweep() {
    const now = Date.now();
    for (const ctx of this.byEmail.values()) {
      try {
        if (ctx.session && now - ctx.session.lastSeen > SESSION_STALE_MS) {
          this.unindexSession(ctx);
          ctx.releaseSession();
        }
        const connected = !!(ctx.tiktok && ctx.tiktok.isConnected());
        // ضيوف الويدجت (صفحات OBS) مش بيمسكوا الحساب حي — بس عملاء التطبيق
        const realClients = [...ctx.wsClients].filter((c) => !c._guest).length;
        const idle =
          !ctx.session &&
          !connected &&
          realClients === 0 &&
          now - ctx.lastSeen > IDLE_CLOSE_MS;
        if (idle) {
          this.remove(ctx);
          continue;
        }
        // توكنات مطرودة عدّت نافذتها (10 دقايق) — امسحها من الفهرس
        for (const [token, owner] of this.bySession) {
          if (owner === ctx &&
              (!ctx.session || token !== ctx.session.token) &&
              !(ctx.kicked && ctx.kicked.token === token && now - ctx.kicked.at < KICK_WINDOW_MS)) {
            this.bySession.delete(token);
          }
        }
      } catch (e) {}
    }
  }

  async flushAll() {
    for (const ctx of this.byEmail.values()) {
      try { await ctx.store.flushCloud(); } catch (e) {}
    }
  }
}

module.exports = { AccountRegistry, AccountContext, ACTIVE_WINDOW_MS, KICK_WINDOW_MS };
